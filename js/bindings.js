$(document).ready(function() {
  
  // User management ***********************************************************

  let loggedIn = $('#loggedIn');
  let loggedOut = $('#loggedOut');
  
  $('#logInButton').click(function () {
    var user = Taxonomic.Users.findByName($('#userName').val());
    if (Taxonomic.login(user)) {
      loggedOut.detach();
      $(document.body).append(loggedIn.show());

      $('#loggedInAs')
        .append('Logged in as ')
        .append($('<span/>', {
          'class': 'user-name'
        }).text(Taxonomic.currentUser().name));
      $('#itemsMain').children().empty().hide();
      $('#tagsMain').children().empty().hide();
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
    DMS.clearStores();
    $('#itemsMain').children().empty();
    $('#tagsMain').children().empty();
  });

  // Item management *******************************************************

  $('#listItemsButton').click(function () {
    let listItemsPane = $('#listItemsPane');
    listItemsPane.empty().show().siblings().hide();

    let filterList = $('<ol/>', {
      'class': 'item-filter-list'
    }).appendTo(listItemsPane);
    let itemListPane = $('<div/>', {
      'class': 'item-list-pane'
    }).appendTo(listItemsPane);

    filterList.append(generateItemFilterItem(itemListPane, filterList));
    refreshItemList(itemListPane, filterList);
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
        let ownerList = parseCSV(additionalOwners.val());

        var tag = Taxonomic.Tags.create({
          name: name.val(),
          description: description.val()
        });

        ownerList
          .map(o => Taxonomic.Users.find({name: o}))
          .map(u => Taxonomic.Users.becomeTagOwner(u, tag));

        createTagPane.hide();
        $('#listTagsButton').click();
      }
    });
    
    createTagPane.append(details).append(createTagButton);
  });

  $('#listTagsButton').click(function () {
    let listTagsPane = $('#listTagsPane');
    listTagsPane.empty().show().siblings().hide();

    let filterList = $('<ol/>', {
      'class': 'tag-filter-list'
    }).appendTo(listTagsPane);
    let tagListPane = $('<div/>', {
      'class': 'tag-list-pane'
    }).appendTo(listTagsPane);

    filterList.append(generateTagFilterItem(tagListPane, filterList));
    refreshTagList(tagListPane, filterList);
  });

});
