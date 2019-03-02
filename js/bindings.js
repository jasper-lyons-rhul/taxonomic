$(document).ready(function() {
  const { Users } = Taxonomic;
  
  // User management ***********************************************************

  let loggedIn = $('#loggedIn');
  let loggedOut = $('#loggedOut');

  let userNameOptions = Users.findAll()
    .map(function (user) {
      return $('<option/>')
        .text(user.name)
        .val(user.id);
    });
  $('#userName').empty()
    .append(userNameOptions);
  
  $('#logInButton').click(function () {
    var user = Users.find(parseInt($('#userName').val(), 10));
    if (Taxonomic.login(user)) {
      loggedOut.detach();
      $(document.body).append(loggedIn.show());

      $('#loggedInAs')
        .append('Logged in as ')
        .append($('<span/>', {
          'class': 'user-name'
        }).text(Taxonomic.currentUser().name));
    } else {
      alert("Unable to log in.");
    }
  });

  $('#logOutButton').click(function () {
    Taxonomic.logout();
    $('#loggedInAs').empty();

    loggedIn.detach();
    $(document.body).append(loggedOut.show());
  });

  // Admin *********************************************************************
  
  $('#resetButton').click(function () {
    Taxonomic.reset();
    window.location.reload();
  });
  $('#addDefaultObjectsButton').click(Taxonomic.loadItems);

  // Item management *******************************************************

  $('#listItemsButton').click(function () {
    let listItemsPane = $('#listItemsPane');
    listItemsPane.empty().show();

    let itemListPane = $('<div/>', {
      'class': 'item-list-pane'
    }).appendTo(listItemsPane);

    refreshItemList(itemListPane);
  });

  $('#itemSearch').keyup(function () {
    $('#listItemsButton').click();
  });

  $('#itemNameFilter').change(function () {
    $('#listItemsButton').click();
  });
  
  // Tag management ************************************************************
  
  $('#newTagButton').click(function () {
    let createTagPane = $('#createTagPane');
    createTagPane.empty().show().siblings().hide();

    let details = $('<table/>', { 'class': 'tag-details' });

    let name = $('<input/>', { type: 'text' });
    addProperty(details, 'Name', name);

    let additionalOwners = $('<input/>', { type: 'text' });
    addProperty(details, 'Additional owners', additionalOwners);
    
    let description = $('<textarea/>');
    addProperty(details, 'Description', description);

    let createTagButton = $('<button/>', {
      type: 'button',
      text: 'Create tag',
      click: function () {
        let ownerList = Utils.parseCSV(additionalOwners.val());

        var tag = Taxonomic.Tags.create({
          name: name.val(),
          description: description.val()
        });

        ownerList
          .map(o => Taxonomic.Users.findAll({name: o})[0])
          .map(u => Taxonomic.Users.becomeTagOwner(u, tag));

        createTagPane.hide();
        $('#listTagsButton').click();
      }
    });
    
    createTagPane.append(details).append(createTagButton);
  });

  $('#listTagsButton').click(function () {
    let listTagsPane = $('#listTagsPane');
    listTagsPane.empty().show();

    let tagListPane = $('<div/>', {
      'class': 'tag-list-pane'
    }).appendTo(listTagsPane);

    refreshTagList(tagListPane);
  });

  $('#tagSearch').keyup(function () {
    $('#listTagsButton').click();
  });
});
