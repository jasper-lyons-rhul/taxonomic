# Taxonomic API

The Taxonomic API provides an interface for the Taxonomic application. There 4
 modules in the API:

## Taxonomic

This module is accessible via a global `Taxonomic` variable and provides access to submodules and highlevel methods for manipulating the currently active user. It has 5 methods and 3 submodules.

### Methods

#### Taxonomic.currentUser()

This method will return a `user` if one is currently logged in or it will return `null`, `user` objects are described below in the `Taxonomic.User` module.

There are a limited set of hardcoded users which are available via the `Taxonomic.User` submodule.

#### Taxonomic.login(user)

This method takes a `user` object and if it is valid makes it the `currentUser`. If it is not it returns `undefined`.

#### Taxonomic.logout()

This method will simply set the `currentUser` to `null`.

#### Taxonomic.canEditItem(item)

This method takes an `item` object and checks to see if any of the item's tags are owned by the current user. If they are then it returns `true` elseit returns `false`.

#### Taxonomic.canEditTag(tag)

This method takes a `tag` object and checks to see if the tag is owned by the `currentUser`. If it is it returns `true` else it returns `false`.

### Submodules

The submodules provide methods to manipulate and query the three types of object in the system: `user`, `item` and `tag`. Each type of object has it's respective module each of which are described below.

Using the submodules is easier if you set them to local variables in your scripts, you then don't need to type out the `Taxonomic` namespace everytime you wish to use them!

```js
var Users = Taxonomic.Users;
var Items = Taxonomic.Items;
var Tags = Taxonomic.Tags;
```

### Taxonomic.Users

The `Taxonomic.Users` module provide methods for manipulating and accessing users within the system. It mostly passes around `user` objects to do this which are just plain old javascript objects (POJOs).

Heres an example:

```js
// A user object
{
    id: 0,
    name: 'Finn'
}
```

There are 5 hardcoded users and you can only log into the system with one of these 5 users.

There are 8 methods for the `Taxonomic.Users` module:

#### Users.findAll(filters)

`findAll` takes a POJO of filters which it will attempt to match exactly from the set of users available e.g.

```js
Users.findAll({ name: 'Finn' });
```

Will return an array with the single `user` object:

```js
{
    id: 0,
    name: 'Finn'
}
```

Filters will not partially match values so:

```js
Users.findAll({ name: 'Fin' });
```

Will return an empty array `[]`.

#### Users.find(id)

`find` takes an id number and will return the `user` with the matching id or `undefined`.

#### Users.findByName(name) 

`findByName` takes a name string and will return the `user` with the matching name or `undefined`.

#### Users.forTags(tags)

`forTags` takes a list of `tag` objects and will return the set of `user` objects that make up the owners of the tags.

#### Users.forItem(item)

`forItem` takes a single item object and will return the set of `user` objects that make up the owners of the tags attached to the item.

#### Users.owns(user, tags) 

`owns` takes a `user` object and a list of `tag` objects. It will return all of the `tag` objects that the `user` owns.

#### Users.becomeTagOwner(user, tag)

`becomeTagOwner` takes a `user` and a `tag` object and will create an ownership relationship in the system between the user and the tag. It will then return `true` if building the relationship was successful and `false` if not.

#### Users.disownTag(user, tag)

`disownTag` takes a `user` and a `tag` object and attempts to remove the ownship relationship between the user and the tag. It will then return `true` if removing the relationship was successful and `false` if not.

### Taxonomic.Tags
`Taxonomic.Tags` provides methods for manipulating and querying the system of `tag` objects. `tag` objects are similar to `user` objects as they are also POJOs but there are some other attributes.

```js
// tag object
{
    name: '...',
    description: '...',
    creator: user,
    createdAt: '2018-02-24 09...'
    open: true
}
```

There are 15 methods for the `Taxonomic.Tags` module:

#### Tags.create(object)

`create` takes a POJO and attempts to create a `tag` from it. This means giving it a valid id, setting createdAt to the current date and ensuring the name attribute is unique. It will return the created `tag` object if successful and `false` if not.

#### Tags.findAll(filters)

`findAll` works the same as `Taxonomic.Users.findAll` but finds and returns `tag` objects.

#### Tags.find(id)

`find` works the same as `Taxonomic.Users.find` but finds returns a `tag` object with the matching id.

#### Tags.forItem(item)

`forItem` works the same as `Taxonomic.Users.forItem` but returns the set of `tag` objects attached to the item.

#### Tags.search(string)

`search` takes a string value and looks for partial matches in the name and description attributes e.g.

```js
Tags.search('The');
```

Might return:

```
[{
    key: 'name',
    element: {
        name: 'The Enchiridion',
        ...
    }
}, {
    key: 'description',
    element: {
        name: 'Mount Cragor',
        description: 'The last known...'
        ...
    }
}, ...]
```
It will return any `tag` objects with attributes that contain the text in the search term.

#### Tags.update(tag)

`update` takes a `tag` object and updates it's state in the system (so it can be retrieved again later). `id`, `createdAt`, `creator` and `open` cannot be updated with this method. It will return a copy of the updated `tag` object.

#### Tags.attached(tag, item)

`attached` takes a `tag` and `item` object and checks to see if the tag is attached to the item. If it is it returns `true` else it returns `false`. If either the `tag` or the `item` do not exist it will return `undefined` and will register an error in the developer tools command line.

#### Tags.attach(tag, items)

`attach` takes a `tag` and `item` or list of `item` objects and attempts to attach the tag to the items. If it is successful the `tag` object is returned else `false` is returned. If an error occurred then `undefined` will be returned and an error will be registered in the developer tools command line. If multiple items are passed then an array of `[tag, false, undefined ...]` is returned and errors are reported to the cli.

#### Tags.detach(tag, item)

`detach` takes a `tag` and `item` or list of `item` objects and attempts to detach the tag from the items. If it is successful it will return the `tag` else it will return `false`. If an error occurred then `undefined` will be returned and an error will be registered in the developer tools command line. If multiple items are passed then an array of `[tag, false, undefined ...]` will be retruned and any errors will be registered on the cli.

#### Tags.close(tag)

`close` takes a tag and attempts to set the `open` attribute to `false` (it is `true` by default). It will return a copy of the updated `tag` if it is successful else an error will have occured and it will return `undefined` and register the error on the developer tools command line. 

#### Tags.reopen(tag)

`reopen` takes a `tag` object and attempts to set the `open` attribute to `true`. If will return a copy of the updated `tag` if succsessful and if not then an error will have occured and it will return `undefined` and register an error on the developer tools command line.

#### Tags.map(from, to)

`map` takes a `tag` or set of `tag` objects as the first argument `from` and a `tag` as the second argument `to`. It will find or create `to` and will detach all of the `from` tags from the items they are currently attached to. It will then attach the `to` tag to those items.

#### Tags.history(tag)

`history` takes a `tag` object and returns a list of `event` objects for the `tag`. `event` objects look like:

```js
{
    subjectId: 0,
    payload: 'Updated tag',
    createdAt: '2018-02-24 09...',
    creator: user
}
```

This can be used to see all of the actions that have been taken relating to a tag.

#### Tags.setOwnersByNames(tag, ownerNames)

`setOwnersByNames` takes a `tag` object and a list of user names. It will call `becomeTagOwner` for each user that isn't already an owner and will call `disownTag` for each user that is an owner but who's name isn't in the `ownerNames` list.

#### Tags.cotags(tag)

`cotags` takes a `tag` object and;

* finds all of the items it is attached to
* finds all of the tags attached to those items
* counts the number of times each tag is attached to one of those items
* returns a POJO like so:

```js
{
    'The Enchiridion': {
        tag: tag, // the tag object
        count: 10
    },
    'Mount Cragor': {
        tag: tag,
        count 2
    },
    ...
}
```

You can use it to discover cotags to a particular tag and rank them by how often they appear together.

### Taxonomic.Items

`Taxonomic.Items` provides methods for manipulating and querying `item` objects. Again, `item` objects are just POJOs and they look like:

```js
{
    id: 0,
    name: "Finn's Sword",
    content: 'Magic Sword Data...',
    description: 'A knarly sword with weird Finn horcrux stuck inside.'
}
```

You cannot create or delete item's via the API. The only way to alter the set of Items available is to add or remove JSON objects from the `items.json` file. This is loaded when ever the page is refreshed:

* new items are added.
* names in the `tags` attribute are used to find (or create) tags which are then attached to the item.
* tags are created by the currently logged in user.

There are 7 methods for the `Taxonomic.Items` module:

#### Items.findAll(filters)

`findAll` works the same as `Taxonomic.Users.findAll` and `Taxonomic.Tags.findAll` but finds and returns `item` objects.

#### Items.find(id)

`find` works the same as `Taxonomic.Users.find` and `Taxonomic.Tags.find` but finds and returns an `item` object.

#### Items.forTags(tags)

`forTags` works the same as `Taxonomic.Users.forTags` but returns `item` objects.

#### Items.searchByTag(string)

`searchByTag` first searches for all of the tags that match the search term (string) and then returns all of the items attached to those tags. It returns results in the same format as `Taxonomic.Tags.search` but the `key` attribute of the result is always 'tag'.

#### Items.search(string)

`search` works the same as `Taxonomic.Tags.search` but finds and returns matching `item` objects.

#### Items.update(item)

`update` works the similarly as `Taxonomic.Tags.update` execpt it prevents you editing the `id`, `name`, `content` and `description` attributes and returns a copy of the updated `item` object.

#### Items.setTagsByNames(items, tagNames)

`setTagsByNames` works similarly to `Taxonomic.Tags.setOwnersByNames` except it calls `Tags.attach` or new tags and `Tags.detach` for old tags not included in the new set of tags.
