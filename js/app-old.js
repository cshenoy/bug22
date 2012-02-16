// An example Backbone application uses a simple
// [LocalStorage adapter](backbone-localstorage.html)
// to persist Backbone models within your browser.

$(function(){

  // Bug Model
  var Bug = Backbone.Model.extend({

    defaults: function() {
      return {
        done:  false,
        bugID: Bugs.nextOrder(),
        summary: null,
        description: null,
        dateCreated: Bugs.dateCreated(),
        type: 'bug'
      };
    },

    // Toggle the `done` state of this bug item.
    toggle: function() {
      this.save({done: !this.get("done")});
    }

  });


  // The collection of todos is backed by *localStorage* instead of a remote
  // server.
  var BugList = Backbone.Collection.extend({

    // Reference to this collection's model.
    model: Bug,

    localStorage: new Store("bugs"),

    // Filter down the list of all todo items that are finished.
    done: function() {
      return this.filter(function(bug){ return bug.get('done'); });
    },

    // Filter down the list to only todo items that are still not finished.
    remaining: function() {
      return this.without.apply(this, this.done());
    },

    // We keep the Todos in sequential order, despite being saved by unordered
    // GUID in the database. This generates the next order number for new items.
    nextOrder: function() {
      if (!this.length) return 1;
      return this.last().get('bugID') + 1;
    },

    // Todos are sorted by their original insertion order.
    comparator: function(bug) {
      return bug.get('bugID');
    },

    dateCreated: function() {
      var d = new Date(),
          month = d.getMonth() + 1,
          date = d.getDate(),
          year = d.getYear() + 1900;
      return month + '-' + date + '-' + year;
    }

  });

  // Create our global collection of bugs.
  var Bugs = new BugList;

  // The DOM element for a todo item...
  var BugView = Backbone.View.extend({

    //... is a list tag.
    tagName:  "tr",

    // Cache the template function for a single item.
    template: _.template($('#item-template').html()),

    // The DOM events specific to an item.
    events: {
      "click .check"              : "toggleDone",
      "dblclick div.bug-summary"    : "edit",
      /*"click span.todo-destroy"   : "clear",*/
      "keypress .todo-input"      : "updateOnEnter"
    },

    // The TodoView listens for changes to its model, re-rendering.
    initialize: function() {
      this.model.bind('change', this.render, this);
      this.model.bind('destroy', this.remove, this);
    },

    // Re-render the contents of the todo item.
    render: function() {
      console.log('bug view render is working.');
      $(this.el).html(this.template(this.model.toJSON()));
      this.setText();
      this.setID();
      this.setDesc();
      return this;
    },

    setID: function() {
      var bugID = this.model.get('bugID');
      this.$('.bug-id').text(bugID);
    },

    // To avoid XSS (not that it would be harmful in this particular app),
    // we use `jQuery.text` to set the contents of the todo item.
    setText: function() {
      var text = this.model.get('text');
      this.$('.bug-summary').text(text);
      this.input = this.$('.todo-input');
      this.input.bind('blur', _.bind(this.close, this)).val(text);
    },

    setDesc: function() {
      var text = this.model.get('description');
      this.$('.bug-desc').text(text);
    },

    // Toggle the `"done"` state of the model.
    toggleDone: function() {
      console.log(this, this.el, this.$el, this.$el.find('.check'));
      console.log(this.model.get('dateCreated'));
      this.$el.find('input').css('display', 'none');
      this.model.toggle();
    },

    // Switch this view into `"editing"` mode, displaying the input field.
    edit: function() {
      $(this.el).addClass("editing");
      this.input.focus();
    },

    // Close the `"editing"` mode, saving changes to the todo.
    close: function() {
      this.model.save({text: this.input.val()});
      $(this.el).removeClass("editing");
    },

    // If you hit `enter`, we're through editing the item.
    updateOnEnter: function(e) {
      console.log(e);
      if (e.keyCode == 13) this.close();
    },

    // Remove this view from the DOM.
    remove: function() {
      $(this.el).remove();
    },

    // Remove the item, destroy the model.
    clear: function() {
      this.model.destroy();
    }

  });

  // The Application
  // ---------------

  // Our overall **AppView** is the top-level piece of UI.
  var AppView = Backbone.View.extend({

    // Instead of generating a new element, bind to the existing skeleton of
    // the App already present in the HTML.
    el: $('#bug-list'),

    // Our template for the line of statistics at the bottom of the app.
    statsTemplate: _.template($('#stats-template').html()),

    // Delegated events for creating new items, and clearing completed ones.
    events: {
      "keypress #new-bug":  "createOnEnter",
    /*"keyup #new-bug":     "showTooltip",
      "click .todo-clear a": "clearCompleted"*/
    },

    // At initialization we bind to the relevant events on the `Todos`
    // collection, when items are added or changed. Kick things off by
    // loading any preexisting todos that might be saved in *localStorage*.
    initialize: function() {
      this.input    = this.$("#new-bug");

      Bugs.bind('add',   this.addBug, this);
      Bugs.bind('reset', this.addAll, this);
      Bugs.bind('all',   this.render, this);

      _.bindAll(this, "addBug");
      console.log(Bugs);
      this.addBug(new Bug());

      Bugs.fetch();
      console.log('appview initialize is working!');
    },

    // Re-rendering the App just means refreshing the statistics -- the rest
    // of the app doesn't change.
    render: function() {
      this.$('#todo-stats').html(this.statsTemplate({
        total:      Bugs.length,
        done:       Bugs.done().length,
        remaining:  Bugs.remaining().length,
      }));

      console.log('appview render is working.');
    },

    addBug: function(bug) {
      var view = new BugView({model: bug});
      console.log('addBug is running.', view.render().el, $(this.el), this.$el);
      this.$el.append(view.render().el);
    },

    // Add all items in the **Todos** collection at once.
    addAll: function() {
      Bugs.each(this.addBug);
    },

    // If you hit return in the main input field, and there is text to save,
    // create new **Todo** model persisting it to *localStorage*.
    createOnEnter: function(e) {
      var text = this.input.val();
      if (!text || e.keyCode != 13) return;
      Bugs.create({text: text});
      this.input.val('');
    },

    // Clear all done todo items, destroying their models.
    clearCompleted: function() {
      _.each(Bugs.done(), function(bug){ bug.destroy(); });
      return false;
    },

    // Lazily show the tooltip that tells you to press `enter` to save
    // a new todo item, after one second.
    showTooltip: function(e) {
      var tooltip = this.$(".ui-tooltip-top");
      var val = this.input.val();
      tooltip.fadeOut();
      if (this.tooltipTimeout) clearTimeout(this.tooltipTimeout);
      if (val == '' || val == this.input.attr('placeholder')) return;
      var show = function(){ tooltip.show().fadeIn(); };
      this.tooltipTimeout = _.delay(show, 1000);
    }

  });

  //Creating the **App**.
  var App = new AppView;

});