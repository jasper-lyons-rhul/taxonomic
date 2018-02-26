/*******************************************************************************
    Common
*******************************************************************************/

function addProperty (target, name, value) {
  target.append(
    $('<tr>')
      .append($('<td>')
              .addClass('property-name')
              .text(name + ':'))
      .append($('<td>')
              .addClass('property-value')
              .append(value))
  );
}

function eventList (dmsObject) {
  let list = $('<ul/>', {
    'class': 'event-list'
  });
  for (let event of dmsObject.getHistory()) {
    let date = $('<div/>', {
      'class': 'event-date'
    }).text(event.date.toString());
    let description = $('<span/>', {
      'class': 'event-description'
    }).text(event.description);
    list.append(
      $('<li/>').append(date).append(description)
    );
  }
  return list;
}

function compileFiltersFromData (filterList) {
  let filters = [];
  for (let filterItem of filterList.find('li'))
    if (typeof $(filterItem).data('filter') != 'undefined')
      filters.push($(filterItem).data('filter'));
  return filters;
}

function dmsObjectList (prefix, infoPaneGenerator, filters, dmsForEach) {
  let list = $('<ul/>');
  let callback = new Callback()
      .setCallback(function (dmsObject) {
        let name = $('<span/>', {
          'class': prefix+'-name',
          text: dmsObject.getName(),
          click: function () {
            informationPane.toggle();
          }
        });
        let informationPane = infoPaneGenerator(dmsObject);
        informationPane.hide();
        let item = $('<li/>').append(name).append(informationPane);
        list.append(item);
      })
      .addFilters(filters);
  dmsForEach(callback);
  return list;
}

/*******************************************************************************
    Item management
*******************************************************************************/

function addItemFilterAsData (option, value, element) {
  switch (option) {
  case 'name':
    element.data('filter', function (item) {
      return item.name.includes(value);
    });
    break
  case 'owner':
    element.data('filter', function (item) {
      return Taxonomic.Users.forItem(item)
        .map(u => u.name).includes(value);
    });
    break;
  case 'tag':
    element.data('filter', function (item) {
      return Taxonomic.Tags.forItem(item)
        .map(t => t.name).includes(value);
    });
    break;
  case 'date':
    element.data('filter', function (item) {
      return item.createdAt.includes(value);
    });
    break;
  default:
    console.error('Unknown filter option:', criterion.val());
  }
}

function generateItemFilterItem (pane, filterList) {
  let filterItem = $('<li/>');
  let criterion = $('<select/>')
      .append($('<option/>').text('name'))
      .append($('<option/>').text('tag'))
      .append($('<option/>').text('date'));
  let pattern = $('<input/>', { type: 'text' });
  let addFilterButton = $('<button/>', {
    type: 'button',
    text: 'Add filter',
    click: function () {
      addItemFilterAsData(criterion.val(), pattern.val(), filterItem);
      addFilterButton.detach();
      filterItem.append(updateFilterButton);
      filterItem.after(generateItemFilterItem(pane, filterList));
      refreshItemList(pane, filterList);
    }
  });
  let updateFilterButton = $('<button/>', {
    type: 'button',
    text: 'Update filter',
    click: function () {
      addItemFilterAsData(criterion.val(), pattern.val(), filterItem);
      refreshItemList(pane, filterList);
    }
  }); 
  filterItem.append(criterion).append(pattern).append(addFilterButton);
  criterion.before('Filter results by ');
  criterion.after(': ');
  return filterItem;
}

function refreshItemList (targetPane) {
  const { Tags, Items } = Taxonomic;

  var itemResults = Items.search($('#itemSearch').val());
  var itemTagResults = Items.searchByTag($('#itemSearch').val());

  var items = Utils.union(
    itemResults.map(r => r.element),
    itemTagResults.map(r => r.element)
  );

  var itemsList = $('<ul/>')
    .append(items.map(function (item) {
      return $('<li/>')
        .append($('<span/>')
          .text(item.name)
          .append(itemInformationPane(item))
        );
    }));

  targetPane.empty()
    .append($('<h3/>').text('Items'))
    .append(itemsList)
  
  // only append cotags if there is a search term.
  if ($('#itemSearch').val()) {
    var cotags = Tags.search($('#itemSearch').val())
      .map(r => Tags.cotags(r.element))
      .reduce(Utils.concat, [])
      .sort((a, b) => b.count - a.count);

    var coTagsList = $('<ul/>')
      .append(cotags.map(function(cotag) {
        return $('<li/>')
          .append($('<span/>')
            .text(cotag.tag.name));
      }));


    targetPane
      .append($('<h3/>').text('Co-Tags'))
      .append(coTagsList);
  }
}

function itemInformationPane (item) {
  let detailsPane = $('<div/>', { 'class': 'item-details-pane' });
  let controlPane = $('<div/>', { 'class': 'item-control-pane' });
  let commentsPane = $('<div/>', { 'class': 'item-comments-pane' });
  let historyPane = $('<div/>', { 'class': 'item-history-pane' });

  let mainPane = $('<div/>', { 'class': 'item-information-pane' })
      .append(detailsPane)
      .append(controlPane);

  // The details pane **********************************************************
  
  let details = $('<table/>', { 'class': 'item-details' });
  addProperty(details, 'Content', item.content);

  var ownersCSV = Taxonomic.Users.forItem(item)
    .map(u => u.name).join(', ');
  addProperty(details, 'Owners', ownersCSV);
  
  addProperty(details, 'Description', item.description);

  var tagsCSV = Taxonomic.Tags.forItem(item)
    .map(t => t.name).join(', ');
  let tags = $('<input/>', {
    type: 'text',
    readonly: true
  }).val(tagsCSV);
  addProperty(details, 'Tags', tags);

  detailsPane.append(details);

  // The control pane **********************************************************

  if (Taxonomic.canEditItem(item)) {
    let editPane = $('<span/>').appendTo(controlPane);
    
    let editButton = $('<button/>', {
      type: 'button',
      text: 'Edit details',
      click: function () {
        tags.prop('readonly', false);

        editButton.detach();
        editPane.append(cancelButton).append(saveButton);
      }
    });
    editPane.append(editButton);
    
    let cancelButton = $('<button/>', {
      type: 'button',
      text: 'Cancel',
      click: function () {
        var tagsCSV = Taxonomic.Tags.forItem(item)
          .map(t => t.name).join(', ');
        tags.val(tagsCSV).prop('readonly', true);
        
        cancelButton.detach();
        saveButton.detach();
        editPane.append(editButton);
      }
    });

    let saveButton = $('<button/>', {
      type: 'button',
      text: 'Save',
      click: function () {
        let tagList = Utils.parseCSV(tags.val());
        if (tagList.length == 0) {
          alert('You have to specify at least one tag.');
          return;
        }

        Taxonomic.Items.setTagsByNames(item, tagList);
        tags.prop('readonly', true);

        if (historyPane.is(':visible'))
          refreshHistoryPane();

        cancelButton.detach();
        saveButton.detach();
        editPane.append(editButton);
      }
    });
  }

  return mainPane;
};

/*******************************************************************************
    Tag management
*******************************************************************************/

function addTagFilterAsData (option, value, element) {
  switch (option) {
  case 'name':
    element.data('filter', function (doc) {
      return doc.getName().includes(value);
    });
    break;
  case 'owner':
    element.data('filter', function (doc) {
      return doc.getOwners().has(value);
    });
    break;
  case 'date':
    element.data('filter', function (doc) {
      return doc.getCreationDate().toDateString().includes(value);
    });
    break;
  default:
    console.error('Unknown filter option:', criterion.val());
  }
}

let generateTagFilterItem = function (pane, filterList) {
  let filterItem = $('<li/>');
  let criterion = $('<select/>')
      .append($('<option/>').text('name'))
      .append($('<option/>').text('owner'))
      .append($('<option/>').text('date'));
  let pattern = $('<input/>', { type: 'text' });
  let addFilterButton = $('<button/>', {
    type: 'button',
    text: 'Add filter',
    click: function () {
      addTagFilterAsData(criterion.val(), pattern.val(), filterItem);
      addFilterButton.detach();
      filterItem.append(updateFilterButton);
      filterItem.after(generateTagFilterItem(pane, filterList));
      refreshTagList(pane, filterList);
    }
  });
  let updateFilterButton = $('<button/>', {
    type: 'button',
    text: 'Update filter',
    click: function () {
      addTagFilterAsData(criterion.val(), pattern.val(), filterItem);
      refreshTagList(pane, filterList);
    }
  }); 
  filterItem.append(criterion).append(pattern).append(addFilterButton);
  criterion.before('Filter results by ');
  criterion.after(': ');
  return filterItem;
}

function refreshTagList (targetPane) {
  const { Tags } = Taxonomic;

  var tags = Tags.search($('#tagSearch').val()).map(r => r.element);

  var tagList = $('<ul/>')
    .append(tags.map(function (tag) {
      return $('<li/>')
        .append($('<span/>')
          .text(tag.name)
          .append(tagInformationPane(tag))
        )
    }));

  targetPane.empty()
    .append($('<h3/>').text('Tags'))
    .append(tagList);
}

function tagInformationPane (tag) {
  let detailsPane = $('<div/>', { 'class': 'tag-details-pane' });
  let controlPane = $('<div/>', { 'class': 'tag-control-pane' });
  let historyPane = $('<div/>', { 'class': 'tag-history-pane' });

  let mainPane = $('<div/>', { 'class': 'tag-information-pane' })
    .append(detailsPane)
    .append(controlPane);

  // The details pane **********************************************************

  let details = $('<table/>', { 'class': 'tag-details' });
  addProperty(details, 'Name', tag.name);

  var ownersCSV = Taxonomic.Users.forTags(tag)
    .map(u => u.name).join(', ');

  let owners = $('<input/>', {
    type: 'text',
    readonly: true
  }).val(ownersCSV);
  addProperty(details, 'Owners', owners);

  let description = $('<textarea/>', {
    readonly: true
  }).val(tag.description);
  addProperty(details, 'Description', description);

  addProperty(details, 'Creation date', tag.createAt);

  detailsPane.append(details);

  // The control pane **********************************************************

  if (Taxonomic.canEditTag(tag)) {
    let editPane = $('<span/>').appendTo(controlPane);

    let editButton = $('<button/>', {
      type: 'button',
      text: 'Edit details',
      click: function () {
        owners.prop('readonly', false);
        description.prop('readonly', false);

        editButton.detach();
        editPane.append(cancelButton).append(saveButton);
      }
    });
    editPane.append(editButton);

    let cancelButton = $('<button/>', {
      type: 'button',
      text: 'Cancel',
      click: function () {
        var ownersCSV = Taxonomic.Users.forTag(tag)
          .map(u => u.name).join(', ');
        owners.val(ownersCSV).prop('readonly', true);
        description.val(tag.description).prop('readonly', true);

        cancelButton.detach();
        saveButton.detach();
        editPane.append(editButton);
      }
    });

    let saveButton = $('<button/>', {
      type: 'button',
      text: 'Save',
      click: function () {
        let ownerList = Utils.parseCSV(owners.val());
        if (ownerList.length == 0) {
          alert('The item-owners group cannot become empty.');
          return;
        }
        Taxonomic.Tags.setOwnersByNames(tag, ownerList);

        tag.description = description.val();
        Taxonomic.Tags.update(tag);

        owners.prop('readonly', true);
        description.prop('readonly', true);

        cancelButton.detach();
        saveButton.detach();
        editPane.append(editButton);
      }
    });

    let closeButton = $('<button/>', {
      type: 'button',
      text: 'Close tag',
      click: function () {
        if (Taxonomic.Tags.close(tag)) {
          reopenButton.show();
          closeButton.hide();
        }
      }
    });
    controlPane.append(closeButton);

    let reopenButton = $('<button/>', {
      type: 'button',
      text: 'Reopen tag',
      click: function () {
        if (Taxonomic.Tags.reopen(tag)) {
          reopenButton.hide();
          closeButton.show();
        }
      }
    }).hide();
    controlPane.append(reopenButton);

    let mapButton = $('<button/>', {
      type: 'button',
      text: 'Map tag',
      click: function () {
        let newTagName = prompt('To which tag would you like to map \'' +
          tag.name + '\'?');
        if (newTagName != null) {
          if (Taxonomic.Tags.map(tag, { name: newTagName })) {
            $('#listTagsButton').click();
          }
        }
      }
    });
    controlPane.append(mapButton);
  } // DMS.canEdit(tag)

  // The history pane **********************************************************
  let refreshHistoryPane = function () {
    historyPane.empty();
    let eventList = $('<ul/>', {
      'class': 'event-list'
    });

    Taxonomic.Tags.history(tag).forEach(function (event) {
      let date = $('<div/>', {
        'class': 'event-date'
      }).text(event.createdAt);
      let description = $('<span/>', {
        'class': 'event-description'
      }).text(event.payload);
      eventList.append(
        $('<li/>').append(date).append(description)
      );
    });

    historyPane.append(eventList);
  };

  let showHistoryButton = $('<button/>', {
    type: 'button',
    text: 'Show history',
    click: function () {
      if (historyPane.is(':visible')) {
        showHistoryButton.text('Show history');
        historyPane.detach();
      } else {
        showHistoryButton.text('Hide history');
        historyPane.appendTo(mainPane);
        refreshHistoryPane();
      }
    }
  });
  controlPane.append(showHistoryButton);

  return mainPane;
}
