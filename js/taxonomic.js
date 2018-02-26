// utility functions
var Utils = {
  copy: (object) => JSON.parse(JSON.stringify(object)),
  merge: (...args) => Object.assign.apply(null, args),
  concat: (a, b) => a.concat(b),
  equal: (a, b) => ((a && a.hasOwnProperty('id')) ? a.id === b.id : a === b),
  unique: function (array) {
    return Object.values(array.reduce(function (seen, element) {
      if (element)
        seen[element.id || element] = element;
      return seen;
    }, {}));
  },
  union: function (first, ...rest) {
    return Utils.unique(first.concat(...rest));
  },
  intersect: function (...arrays) {
    return arrays.reduce(function (arr1, arr2) {
      return Object.values(arr1.reduce(function (seen, element) {
        if (arr2.filter(Utils.equal.bind(null,  element)).length > 0)
          seen[element.id || element] = element;
        return seen;
      }, {}));
    });
  },
  parseCSV: function (values) {
    return values
      .split(',')
      .map(function (str) {
        return str.trim();
      })
      .filter(function (str) {
        return str != '';
      });
  }
};

var Taxonomic = (function () {
  const { copy, merge, concat, equal, unique, intersect } = Utils;

  // Persisting data to the browser's local storage
  function save() {
    localStorage.setItem('taxonomic', JSON.stringify(data));
  }
  function load() {
    return JSON.parse(localStorage.getItem('taxonomic'));
  }
  function reset() {
    localStorage.removeItem('taxonomic');
    data = {
      users: [],
      currentUser: null,
      items: [],
      tags: [],
      events: [],
      taggedItems: [],
      ownedTags: []
    };
    ['Finn', 'Jake', 'Marcelene', 'Fiona', 'Cat', 'Princess Bubble Gum', 'Ice King']
      .forEach(function (name) {
        CRUD.create(data.users, { name: name });
      });
  }
  function loadItems() {
    return fetch('./items.json').then(function (res) {
      return res.json();
    }).then(function (items) {
      data.items = [];
      data.taggedItems = [];

      items.forEach(function (itemObject) {
        var tags = itemObject.tags;
        delete itemObject.tags;
        var item = CRUD.create(data.items, itemObject);
        Items.setTagsByNames(item, tags);
      });
    }).catch(function (err) {
      console.error(err);
    });
  }

  // the main data store
  var data = load() || {
    users: [],
    currentUser: null,
    items: [],
    tags: [],
    events: [],
    taggedItems: [],
    ownedTags: []
  }

  // Create, Read, Update, Delete and Search for POJOs in arrays
  var CRUD = {
    idCounter: 0,
    create: function (array, template, unique) {
      if (unique && unique.hasOwnProperty('length')) {
        var filters = unique.reduce(function (filters, key) {
          filters[key] = template[key];
          return filters;
        }, {});

        if (CRUD.read(array, filters).length > 0) {
          return console.error(`${unique.join(', ')} must be unique`);
        }
      }

      var object = merge(template, {
        id: CRUD.idCounter++
      });
      array.push(object);

      save();
      return object;
    },
    update: function (array, id, object) {
      var original = CRUD.read(array, { id: id })[0];
      if (!original)
        throw "Can't update element that doesn't exist";

      merge(original, object);

      save();
      return original;
    },
    read: function (array, filters) {
      return array.filter(function (item) {
        for (var key in filters)
          if (!equal(item[key], filters[key]))
            return false;

        return true;
      });
    },
    delete: function (array, id) {
      var element = CRUD.read(array, { id: id })[0];
      if (!element)
        throw "Can't delete element that doesn't exist";

      var index = array.indexOf(element);
      if (index < 0)
        throw "Can't find element in array"

      save();
      return array.splice(index, 1);
    },
    search: function (array, string, keys) {
      return array.map(function (element) {
        for (var key in element) {
          if (keys && !keys.includes(key)) {
            continue;
          }

          if (element[key].toLowerCase().indexOf(string.toLowerCase()) > -1) {
            return {
              key: key,
              element: element
            };
          }
        }
      }).filter(e => e !== undefined);
    }
  }

  // Manage event objects
  var Events = {
    findAll: function (filters) {
      return copy(CRUD.read(data.events, filters));
    },
    create: function (object) {
      var event = merge({
        subjectId: null,
        payload: '',
        createdAt: (new Date).toString(),
        creator: API.currentUser()
      }, object);

      if (event.subjectId === null)
        return console.error("Can't create an event without a subjectId");

      return copy(CRUD.create(data.events, event));
    },
    createFor: function(subject, payload) {
      return Events.create({
        subjectId: subject.id,
        payload: payload
      });
    }
  }

  // Manage user objects
  var Users = {
    findAll: function (filters) {
      return copy(CRUD.read(data.users, filters));
    },
    find: function (id) {
      return Users.findAll({ id: id })[0];
    },
    findByName: function (name) {
      return Users.findAll({ name: name })[0];
    },
    forTags: function (tags) {
      if (!tags)
        return [];

      if (!tags.hasOwnProperty('length'))
        tags = [tags];

      var owners = tags
        .map(t => CRUD.read(data.ownedTags, { tagId: t.id }))
        .reduce(concat, [])
        .map(ot => Users.find(ot.userId));

      return unique(owners);
    },
    forItem: function (item) {
      return Users.forTags(Tags.forItem(item));
    },
    owns: function (user, tags) {
      if (!tags.hasOwnProperty('length'))
        tags = [tags];
      
      var ownedTags = tags.filter(function (tag) {
        return CRUD.read(data.ownedTags, {
          userId: user.id,
          tagId: tag.id
        })[0];
      });

      return copy(ownedTags);
    },
    becomeTagOwner: function (user, tag) {
      if (!user || !Users.find(user.id))
        return console.error("A user that doesn't exist can't own a tag");

      if (!tag || !Tags.find(tag.id))
        return console.error("A user can't own a tag that doesn't exist");

      var ownedTag = CRUD.create(data.ownedTags, {
        userId: user.id,
        tagId: tag.id
      }, ['userId', 'tagId']);

      if (!ownedTag)
        return false;

      Events.createFor(user, `${user.name} became owner of ${tag.name}`);
      Events.createFor(tag, `${user.name} became owner of ${tag.name}`);
      return true;
    },
    disownTag: function (user, tag) {
      var ownedTag = CRUD.read(data.ownedTags, {
        userId: user.id,
        tagId: tag.id
      })[0];

      if (CRUD.delete(data.ownedTags, ownedTag.id)) {
        Events.createFor(user, `${user.name} disowned ${tag.name}`);
        Events.createFor(tag, `${user.name} disowned ${tag.name}`);
        return true;
      } else {
        return false;
      }
    }
  };

  // Manage Item objects
  var Items = {
    findAll: function (filters) {
      var array = data.items;

      if (filters && filters.tags) {
        array = Items.forTags(filters.tags);
        delete filters.tags
      }
      return copy(CRUD.read(array, filters));
    },
    find: function (id) {
      return Items.findAll({ id: id })[0] || console.error('Item not found');
    },
    forTags: function (tags) {
      if(!tags)
        return [];
        
      if (!tags.hasOwnProperty('length'))
        tags = [tags];

      var items = tags
        .map(t => CRUD.read(data.taggedItems, { tagId: t.id }))
        .reduce(concat, [])
        .map(ti => Items.find(ti.itemId));

      return unique(items);
    },
    searchByTag: function (string) {
      return Tags.search(string).map(function (result) {
        return Items.forTags(result.element).map(function (item) {
          return {
            key: 'tag',
            tag: result.element,
            element: item
          };
        });
      }).reduce(concat, []);
    },
    search: function (string) {
      return copy(CRUD.search(data.items, string, ['name', 'description']));
    },
    update: function (item) {
      item = copy(item);
      var id = item.id;
      if (!id)
        return console.error("Can't udpate an item without an id");

      Events.createFor(item, `Updated ${item.name}`);
      delete item.id;
      return copy(CRUD.update(data.items, id, item));
    },
    setTagsByNames: function (item, tagNames) {
      var newTags = tagNames
        .map(n => Tags.findAll({ name: n })[0] || Tags.create({ name: n }));
      var currentTags = Tags.forItem(item);
      
      currentTags.forEach(function (tag) {
        if (CRUD.read(newTags, tag).length === 0)
          Tags.detach(tag, item);
      });

      newTags.forEach(function (tag) {
        if (CRUD.read(currentTags, tag).length === 0)
          Tags.attach(tag, item);
      });

      return item;
    }
  };

  // Manage tag objects
  var Tags = {
    create: function (object) {
      if (!API.currentUser())
        return console.error("Can't create a tag without a current user");

      var newTag = CRUD.create(data.tags, merge({
        name: '',
        description: '',
        creator: API.currentUser(),
        createdAt: (new Date()).toString(),
        open: true
      }, object), ['name']);

      if (!newTag)
        return false;

      Events.createFor(newTag, `Created new tag ${object.name}`);
      Users.becomeTagOwner(API.currentUser(), newTag);
      return copy(newTag);
    },
    findAll: function (filters) {
      return copy(CRUD.read(data.tags, filters));
    },
    find: function (id) {
      return Tags.findAll({ id: id })[0];
    },
    forItem: function (item) {
      var taggedItems = CRUD.read(data.taggedItems, { itemId: item.id });
      return taggedItems.map(ti => Tags.find(ti.tagId));
    },
    search: function (string) {
      return copy(CRUD.search(data.tags, string, ['name', 'description']));
    },
    update: function (tag) {
      tag = copy(tag);
      var id = tag.id;
      if (!id)
        return console.error("Can't update a tag without an id");

      Events.createFor(tag, `Updated tag ${tag.name}`);
      delete tag.id;
      delete tag.createdAt;
      delete tag.creator;
      delete tag.open;
      return copy(CRUD.update(data.tags, id, tag));
    },
    attached: function (tag, item) {
      if (!Tags.find(tag.id))
        return console.error("Tag doesn't exist so couldn't be attached to item");

      if (!Items.find(item.id))
        return console.error("A tag couldn't be attached to an item that doesn't exist");

      return CRUD.read(data.taggedItems, {
        tagId: tag.id,
        itemId: item.id
      }).length > 0;
    },
    attach: function (tag, item) {
      if (item.hasOwnProperty('length'))
        return item.map(i => Tags.attach(tag, i));

      if (!tag.open)
        return console.error("Can't attach a tag that is closed");

      if (!Tags.find(tag.id))
        return console.error("Can't attach tag that doesn't exist to item");

      if (!Items.find(item.id))
        return console.error("Can't attach tag to item that doesn't exist");

      var taggedItem = CRUD.create(data.taggedItems, {
        tagId: tag.id,
        itemId: item.id
      }, ['tagId', 'itemId']);

      if (taggedItem) {
        Events.createFor(tag, `Attached ${tag.name} to ${item.name}`);
        Events.createFor(item, `Attached ${tag.name} to ${item.name}`);
        return tag;
      } else {
        return false;
      }
    },
    detach: function (tag, item) {
      if (item.hasOwnProperty('length'))
        return item.map(i => Tags.detach(tag, i));

      if (!Tags.find(tag.id))
        return console.error("Can't detach tag that doesn't exist");

      if (!Items.find(item.id))
        return console.error("Can't detach tag from item that doesn't exist");

      var taggedItem = CRUD.read(data.taggedItems, {
        tagId: tag.id,
        itemId: item.id
      })[0];

      if (!taggedItem)
        return console.error(`${item.name} has no tag ${tag.name}`);

      if (CRUD.delete(data.taggedItems, taggedItem.id)) {
        Events.createFor(tag, `Detached ${tag.name} from ${item.name}`);
        Events.createFor(item, `Detached ${tag.name} from ${item.name}`);
        return tag;
      } else {
        return false;
      }
    },
    close: function (tag) {
      if (!tag.open)
        return console.error("Can't close a tag that's already closed");

      if (Items.forTags(tag).length > 0)
        return console.error("Can't close a tag still attached to items");

      Events.createFor(tag, `Closed ${tag.name}`);

      tag.open = false;
      return copy(CRUD.update(data.tags, tag.id, tag));
    },
    reopen: function (tag) {
      if (tag.open)
        return console.error("Can't open a tag that's already open");

      Events.createFor(tag, `Reopened ${tag.name}`);
      tag.open = true;
      return copy(CRUD.update(data.tags, tag.id, tag));
    },
    map: function (tags, newTag) {
      newTag = Tags.findAll(newTag)[0] || Tags.create(newTag);

      if (!tags.hasOwnProperty('length'))
        tags = [tags];

      var items = tags.map(function (tag) {
        var items = Items.forTags(tag);
        items.map(Tags.detach.bind(null, tag))
        return items;
      }).reduce(concat, []);
      
      items.map(Tags.attach.bind(null, newTag));

      tags.forEach(function (tag) {
        Events.createFor(tag, `Mapped ${tag.name} to ${newTag.name}`);
        Events.createFor(newTag, `Mapped ${tag.name} to ${newTag.name}`);
      });
      
      return copy(newTag);
    },
    history: function (tag) {
      return Events.findAll({ subjectId: tag.id });
    },
    setOwnersByNames: function (tag, ownerNames) {
      var newOwners = ownerNames
        .map(n => Users.findAll({ name: n })[0] || console.error(`The user ${n} doesn't exist so can't own an item`))
        .filter(u => u !== undefined);
      var currentOwners = Users.forTags(tag);
      
      currentOwners.forEach(function (user) {
        if (CRUD.read(newOwners, user).length === 0)
          Users.disownTag(user, tag);
      });

      newOwners.forEach(function (user) {
        if (CRUD.read(currentOwners, user).length === 0)
          Users.becomeTagOwner(user, tag);
      });

      return tag;
    },
    cotags: function (tag) {
      if (!tag)
        return [];

      var items = Items.forTags(tag);

      var tags = items
        .map(i => Tags.forItem(i))
        .reduce(concat, []);

      var cotags = tags.reduce(function (cotags, tag) {
        cotags[tag.name] = cotags[tag.name] || {
          tag: tag,
          count: 0
        };
        cotags[tag.name].count++;
        return cotags;
      }, {});

      // remove the parent tag from the co-tags list
      delete cotags[tag.name];

      return Object.values(cotags);
    }
  };


  var API = {
    currentUser: function () {
      return copy(data.currentUser);
    },
    login: function (user) {
      if (!user)
        return console.error("A user that doesn't exist can't login");

      Events.createFor(user, `Logged ${user.name} in`);
      data.currentUser = copy(user);
      return copy(data.currentUser);
    },
    logout: function () {
      var user = API.currentUser();
      Events.createFor(user, `Logged ${user.name} out`);
      data.currentUser = null
      return null;
    },
    canEditItem: function (item) {
      return Users.owns(API.currentUser(), Tags.forItem(item)).length > 0;
    },
    canEditTag: function (tag) {
      return Users.owns(API.currentUser(), tag).length > 0;
    },
    reset: reset,
    loadItems: loadItems,
    Users: Users,
    Items: Items,
    Tags: Tags
  };

  API.reset();
  
  return API;
})();
