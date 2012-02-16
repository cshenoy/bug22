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
        dateUpdated: null,
        type: 'bug'
      };
    },

    toggle: function() {
      this.save({done: !this.get("done")});
    }

  });


  var BugList = Backbone.Collection.extend({

    model: Bug,

    localStorage: new Store("bugs"),

    done: function() {
      return this.filter(function(bug){ return bug.get('done'); });
    },

    remaining: function() {
      return this.without.apply(this, this.done());
    },

    nextOrder: function() {
      if (!this.length) return 1;
      return this.last().get('bugID') + 1;
    },

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

  var Bugs = new BugList;

  var BugView = Backbone.View.extend({

    tagName:  "tr",

    template: _.template($('#bugrow-template').html()),

    events: {
      "click .check"            : "toggleDone",
      "dblclick .bug-text"      : "edit",
      "click span.bug-delete"   : "clear",
      "keypress .bug-update"    : "updateOnEnter"
    },

    initialize: function() {
      this.model.bind('change', this.render, this);
      this.model.bind('destroy', this.remove, this);
    },

    render: function() {
      $(this.el).html(this.template(this.model.toJSON()));
      this.setText();
      this.setID();
      this.setDesc();
      this.setBugDate();
      this.doneAdd();
      return this;
    },

    modelFacade: function(first, second){
      var first = this.model.get(first);
      this.$(second).text(first);
    },

    setID: function() {
      this.modelFacade('bugID', '.bug-id');
    },

    setBugDate: function() {
      this.modelFacade('dateCreated', '.date-created');
    },

    setText: function() {
      var text = this.model.get('summary');
      this.$('.bug-text').text(text);
      
      this.input = this.$('.bug-update');
      this.input.bind('blur', _.bind(this.close, this)).val(text);
    },

    setDesc: function() {
      var text = this.model.get('description');
      this.$('.bug-desc').text(text);
    },

    toggleDone: function() {
      this.$el.find('input').css('display', 'none');
      this.model.toggle();
      this.doneAdd();
    },

    doneAdd: function() {
      var done = this.model.get('done');
      done == true ? this.$el.addClass('done') : this.$el.removeClass('done');
    },

    edit: function() {
      this.$el.addClass("editing");
      this.input.focus();
    },

    close: function() {
      this.model.save({summary: this.input.val()});
      $(this.el).removeClass("editing");
    },

    updateOnEnter: function(e) {
      if (e.keyCode == 13) this.close();
    },

    remove: function() {
      $(this.el).remove();
    },

    clear: function() {
      this.model.destroy();
    }

  });
  var ak = 1;
  var AppView = Backbone.View.extend({

    el: $("#bugger"),

    statsTemplate: _.template($('#stats-template').html()),

    events: {
      "click .create-bug": "showCreate",
      "keypress #bug-form":  "createOnEnter",
    },

    initialize: function() {
      this.input    = this.$("#bug-summary");

      Bugs.bind('add',   this.addBug, this);
      Bugs.bind('reset', this.addAll, this);
      Bugs.bind('all',   this.render, this);

      Bugs.fetch();
    },

    render: function() {
      this.$('#bugs-open').html(this.statsTemplate({
        total:      Bugs.length,
        done:       Bugs.done().length,
        remaining:  Bugs.remaining().length,
      }));
      console.log(ak); ak++;
    },

    addBug: function(bug) {
      var view = new BugView({model: bug});
      $("#bug-list").append(view.render().el);
    },

    addAll: function() {
      Bugs.each(this.addBug);
    },

    showCreate: function() {
      this.$el.find('#bug-form').show().prev().hide();
    },

    closeCreate: function() {
      this.$el.find('#bug-form').hide().prev().show();
    },

    createOnEnter: function(e) {
      var text = this.input.val();
      if (e.keyCode == 13 && !text) console.log('waaa');
      if (!text || e.keyCode != 13) return;
      Bugs.create({summary: text});
      this.input.val('');
      this.closeCreate();
    },

    clearCompleted: function() {
      _.each(Bugs.done(), function(bug){ bug.destroy(); });
      return false;
    },

  });

  var App = new AppView;

});