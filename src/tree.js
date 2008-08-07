var Tree = Class.create({
  
  initialize: function(element, container) {
    this.klasses = element.ownerDocument.bindings;

    this.load(element, container);

    this.invoke('run');
    //this.registerUnload();
  },
  
  load: function(element, parent) {
    var container, components = {}, list = [];
    
    if (element.className)
      list = element.className.split(' ');
    if (element.id)
      list.unshift(element.id);
    
    for (var i = 0, id, ids = []; i < list.length; i++) {
      id = list[i];
      
      if (!ids[id]) {
        ids[id] = true;
        
        if (id != element.id)
          ids.push(id);
        
        if (this.klasses[id]) {
          container = container || this.push(new Container(element, ids, components, parent));
          components[id] = new this.klasses[id](container, id);
        }
        if (parent) {
          parent.objects[id] || parent.set(id, components[id] || element);
        }
      }
    }
    
    for (var i = 0, node; i < element.childNodes.length; i++) {
      node = element.childNodes[i];
      
      if (node.nodeType == 1)
        this.load(node, container || parent);
    }
    
    if (parent && container)
      for (var name in parent.components)
        container.objects[name] || container.set(name, parent.components[name]);
  },
  
  push: function(item) {
    if (this.j) {
      item.prev   = this.j;
      this.j.next = item;
    }
    
    this.i = this.i || item;
    this.j = item;
    
    return item;
  },
      
  invoke: function(method) {
    var container;
    
    if (container = this.i)
      do
        container[method]();
      while ((container = container.next) && (container != this.j.next));    
  },
    
  registerUnload: function() {
    if (window.attachEvent) {
      var tree = this; 
      window.attachEvent('onunload', function() { tree.invoke('unload') });
    }
  }
});

var Container = Class.create({

  initialize: function(element, names, components, container) {
    this.element    = element;
    this.document   = element.ownerDocument;
    this.container  = container;
    this.names      = names;
    this.components = components;
    this.objects    = {};
  },
    
  run: function() {
    for (var name in this.components)
      this.components[name].run();
  },
    
  update: function(object) {
    return typeof object == 'string' ? this.updateText(object) : this.updateElements(object);
  },
  
  updateText: function(data) {
    this.each(function() {
      this.move();
    });
    
    if (this.element.childNodes.length == 1 && this.element.firstChild.nodeType == 3) {
      this.element.firstChild.data = data;
    } else {
      this.element.innerHTML = '';
      this.element.appendChild(this.document.createTextNode(data));      
    }
    return this.element.firstChild;
  },
  
  updateElements: function(object) {
    for (var id in object)
      if (this.objects[id] && this.objects[id].nodeType == 1)
        this.objects[id].innerHTML = object[id];
  },
  
  append: function(component, duration) {
    return this.insert(component, null, duration);
  },
     
  insert: function(component, next, duration) {
    if (typeof component == 'string')
      component = this.element.ownerDocument.load(component);
    
    var prev, container = this, insert = component.container;
    
    if (next) {
      if (next.name)
        next = next.container;
      
      if (next != insert.next) {
        this.element.insertBefore(insert.element, next.element);
        insert.move(next.prev, this, next);
      }
    } else {
      this.element.appendChild(insert.element);
      
      prev = this.getLast() || this;
      
      if (prev != insert)
        insert.move(prev, this, prev.next == insert ? prev.next.next : prev.next);
    }

    if (duration && (duration > 0))
      return component.appear(duration);

    return component;
  },
    
  move: function(prev, container, next) {
    if (this.container) {
      // Remove references to containing components:
      for (var name in this.objects) {
        if (this.objects[name].element == this.container.element)
          this.unset(name);
        }
      
      // Remove/update child references to these components:
      for (var name in this.container.objects) {
        if (this.container.objects[name].element == this.element) {
          this.container.unset(name);
          
          // If there is a later child with this name, move pointer to that:
          var c = this.getNext(name);
          
          while (c && this.contains(c))
            c = c.next()

          if (c && this.container.contains(c))
            this.container.set(name, c);            
        }
      }
    }
    
    var i = this, j = this.getLast() || this;

    // Detach from list:
    if (i.prev) i.prev.next = j.next;
    if (j.next) j.next.prev = i.prev;
    
    // Re-attach in new position:
    if (i.prev = prev) prev.next = i;
    if (j.next = next) next.prev = j;
    
    if (this.container = container) {
      for (var name in this.components) {
        // Create/update reference if this is the new first instance of it's type:
        if (!container.objects[name] || (container.objects[name] != container.first(name))) {
          container.unset(name);
          container.set(name, this.components[name]);
        }
      }
      
      for (var name in container.components)
        this.objects[name] || this.set(name, container.components[name]);
    }
  },
  
  addName: function(name) {
    if (!this.hasName(name)) {
      this.names.unshift(name);
      this.element.className = this.names.join(' ');
    }
    return this.names;
  },
  
  removeName: function(name) {
    if (name == this.element.id)
      return;
    
    for (var i = 0; i < this.names.length; i++) {
      if (this.names[i] == name) {
        this.names.splice(i, i + 1);
        return this.element.className = this.names.join(' ');
      }
    }
    return this.element.className;
  },

  hasName: function(name) {
    for (var i = 0; i < this.names.length; i++)
      if (this.names[i] == name)
        return true;
    return false;
  },

  remove: function(duration) {
    var container = this;
    
    if (duration > 0)
      return this.fade(duration, function() { container.remove() });
    
    this.move();
    this.element.parentNode.removeChild(this.element);
  },
  
  fade: function(duration, callback) {
    var container = this;
    
    new Transition(container.element, 1, 0, duration, function(k) {
      container.setOpacity(k);
    }, function() {
      container.element.style.display = 'none';
      
      if (callback)
        callback.call(container);
    });
  },
  
  appear: function(duration, callback) {
    this.element.style.display = '';
    
    var container = this;
    
    new Transition(container.element, 0, 1, duration, function(k) {
      container.setOpacity(k);
    }, function() {
      if (callback)
        callback.call(container);
    });
  },
  
  setOpacity: function(k) {
    if (window.ActiveXObject)
      this.element.style.filter = "alpha(opacity=" + (k * 100) + ")";
    else
      this.element.style.opacity = k;
  },

  set: function(id, object) {    
    for (var name in this.components)
      this.components[name].set(id, object);
    
    return this.objects[id] = object;
  },

  unset: function(id) {
    for (var name in this.components)
      this.components[name].unset(id);

    delete(this.objects[id]);
  },
    
  collect: function(name) {
    var list = [];
    this.each(function() {
      if (this.components[name])
        list.push(this.components[name]);
    });
    return list;
    // var components = [], containers = this.getChildren();
    //   
    // for (var i = 0; i < containers.length; i++)
    //   if (containers[i].components[name])
    //     components.push(containers[i].components[name]);
    //   
    // return components;
  },
 
  each: function(iterator) {
    var prev = this, c = this.next;
    
    while (c && this.contains(c)) {
      
      if (result = iterator.apply(c))
        return result;
      
      if (c == prev.next) {
        prev = c;
        c = c.next;
      } else { // the container was removed - jump to the following
        c = prev.next;
      }
    }
    // var result, c = this;
    // while ((c = c.next) && this.contains(c) && !(result = iterator.apply(c)));
    // return result;
  },
  
  contains: function(child) {
    var c = child;
    
    while (c = c.container)
      if (c == this) return true;

    return false;
  },
    
  first: function(name) {
    return this.each(function() {
      return this.components[name];
    });
  },
  
  last: function(name) {
    var component;
    this.each(function() {
      component = this.components[name] || component;
    });
    return component;
  },
  
  getPrev: function(name) {
    var component, container = this.prev;
    
    while (container && !(component = container.components[name]))
      container = container.prev;
      
    return component;
  },
  
  getNext: function(name) {
    var component, container = this.next;

    while (container && !(component = container.components[name]))
      container = container.next;
      
    return component;
  },
  
  getLast: function() {
    var last;
    this.each(function() { last = this });
    return last;
  },
  
  toString: function() {
    return this.names.join(' ');
  }
});