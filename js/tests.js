const { module, test } = QUnit;
const { Users, Items, Tags } = Taxonomic;

module("Logged out");
test("Create a tag", function (assert) {
  assert.notOk(Tags.create({ name: 'test' }));
});

module("Logged In", {
  beforeEach: async function () {
    var user = Users.findAll()[0];
    Taxonomic.login(user);
    await Taxonomic.loadItems();
  },
  afterEach: function () {
    Taxonomic.reset();
  }
});

test('Create a tag', function (assert) {
  assert.ok(Tags.create({ name: 'tag' }));
});

test('Attach a tag to an item', function (assert) {
  var tag = Tags.create({ name: 'tag' });
  var item = Items.findAll()[0];

  assert.ok(Tags.attach(tag, item));
});

test('Attach a set of tags to an item', function (assert) {
  var tag1 = Tags.create({ name: 'tag1' });
  var tag2 = Tags.create({ name: 'tag2' });
  var item = Items.findAll()[0];

  assert.ok(Items.setTagsByNames(item, ['tag1', 'tag2']));
});

test('Remove a tag from an item', function (assert) {
  var tag = Tags.create({ name: 'tag' });
  var item = Items.findAll()[0];

  Tags.attach(tag, item);
  assert.ok(Tags.detach(tag, item));
});

test('Remove a tag from a set of items', function (assert) {
  var items = Items.findAll();
  var tag = Tags.create({ name: 'tag' });

  assert.ok(Tags.attach(tag, items));
  assert.ok(Tags.detach(tag, items));
});

test('Add owner to tag', function (assert) {
  var tag = Tags.create({ name: 'tag1' });
  var user = Users.findAll()[1];

  assert.ok(Users.becomeTagOwner(user, tag));
});

test('Remove owner from tag (only by members, always at least 1 owner)', function (assert) {
  var tag = Tags.create({ name: 'tag1' });
  var user = Users.findAll()[1];

  Users.becomeTagOwner(user, tag);
  assert.ok(Users.disownTag(Taxonomic.currentUser(), tag));
});

test('Close a tag (if no items)', function (assert) {
  var tag = Tags.create({ name: 'tag' });
  var item = Items.findAll()[0];

  Tags.attach(tag, item);
  assert.notOk(Tags.close(tag));

  Tags.detach(tag, item);
  assert.ok(Tags.close(tag));
});

test('Reopen a tag', function (assert) {
  var tag = Tags.create({ name: 'tag' });
  Tags.close(tag);

  assert.ok(Tags.reopen(tag));
});

test('Map a tag to another tag', function (assert) {
  var currentTag = Tags.findAll()[0];
  var item = Items.findAll()[3];
  Tags.attach(currentTag, item);

  var newTag = Tags.create({ name: 'tag' });

  assert.ok(Tags.map(currentTag, newTag));
});

test('Map a set of tags to another tag', function (assert) {
  var currentTags = Tags.findAll();
  var newTag = Tags.create({ name: 'tag'});

  assert.ok(Tags.map(currentTags, newTag));
});

test('Get history of tag', function (assert) {
  var tag = Tags.create({ name: 'tag' });
  // 2 events are added when a tag is created
  //    1. created event
  //    2. add currentUser as owner
  assert.equal(Tags.history(tag).length, 2);
});

test('Get all items with tag attached', function (assert) {
  var items = Items.findAll();
  var tag = Tags.create({ name: 'tag' });
  Tags.attach(tag, items);
  
  assert.deepEqual(Items.forTags(tag), items);
});

test('Get all items with tags attached', function (assert) {
  var items = Items.findAll();
  var tag1 = Tags.create({ name: 'tag1' });
  var tag2 = Tags.create({ name: 'tag2' });
  Tags.attach(tag1, items);
  Tags.attach(tag2, items);
  
  var items2 = Items.forTags([tag1, tag2]);
  assert.deepEqual(items2, items);
});

test('Get all cotags for a tag', function (assert) {
  var item = Items.findAll()[0];
  var itemTags = Tags.forItem(item);
  var tag = Tags.create({ name: 'test' });
  Tags.attach(tag, item);

  var cotags = Tags.cotags(tag);
  assert.equal(cotags.length, itemTags.length);
  // there should be only one of each tag
  assert.deepEqual(cotags.map(ct => ct.count), itemTags.map(it => 1));
});

test('Sort tags by date', function (assert) {
  // fixed dates will always fail at some point in the future.
  var today = new Date();
  var tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  var tag1 = Tags.create({ name: 'tag1', createdAt: tomorrow});
  var tag2 = Tags.create({ name: 'tag2', createdAt: today });

  var sorted = Tags.findAll().sort(function (a, b) {
    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });

  assert.deepEqual(tag1, sorted[0]);
  assert.deepEqual(tag2, sorted[1]);
});

test('Sort tags by items', function (assert) {
  var tag1 = Tags.create({ name: 'tag1' });
  var tag2 = Tags.create({ name: 'tag2' });

  var items = Items.findAll();

  Tags.attach(tag1, items);
  Tags.attach(tag2, items[0]);

  var sorted = [tag2, tag1].sort(function (a, b) {
    return Items.forTags(b).length - Items.forTags(a).length;
  });

  assert.deepEqual(tag1, sorted[0]);
  assert.deepEqual(tag2, sorted[1]);
});

test('Sort tags by cotags', function (assert) {
  var tag1 = Tags.create({ name: 'tag1' });
  var tag2 = Tags.create({ name: 'tag2' });
  var tag3 = Tags.create({ name: 'tag3' });

  var items = Items.findAll();

  Tags.attach(tag1, items[0]);
  Tags.attach(tag2, items[0]);
  Tags.attach(tag3, items[1]);

  var sorted = [tag3, tag1].sort(function (a, b) {
    return Tags.cotags(b).length - Tags.cotags(a).length;
  });

  assert.deepEqual(tag1, sorted[0]);
  assert.deepEqual(tag3, sorted[1]);
});

test('Search items by tag', function (assert) {
  var tag = Tags.create({ name: 'tag' });  
  var item = Items.findAll()[0];
  Tags.attach(tag, item);

  var items = Items.searchByTag('ta');
  assert.deepEqual(items[0].element, item);
});

test('Search items by name', function (assert) {
  var item = Items.findAll()[0];
  var searchTerm = item.name.substr(item.name.length - 3);
  var results = Items.search(searchTerm);

  assert.equal(results[0].key, 'name');
  assert.deepEqual(results[0].element, item);
});

test('Search items by description', function (assert) {
  var item = Items.findAll()[0];
  var searchTerm = item.description.substr(item.description.length - 3);
  var results = Items.search(searchTerm);

  assert.equal(results[0].key, 'description');
  assert.deepEqual(results[0].element, item);
});

test('Search tags by name', function (assert) {
  var tag = Tags.findAll()[0];
  var searchTerm = tag.name.substr(tag.name.length - 3);
  var results = Tags.search(searchTerm);

  assert.equal(results[0].key, 'name');
  assert.deepEqual(results[0].element, tag);
});

test('Search tags by description', function (assert) {
  var tag = Tags.create({ name: 'tag', description: '1234' });
  var results = Tags.search('1234');

  assert.equal(results[0].key, 'description');
  assert.deepEqual(results[0].element, tag);
});

test('Flagging a tag', function (assert) {
  var tag = Tags.create({ name: 'test', description: 'this is a test' });

  Tags.flag(tag);
  assert.ok(Tags.isFlagged(tag));

  Tags.unflag(tag);
  assert.notOk(Tags.isFlagged(tag));
});
