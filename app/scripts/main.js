'use strict';
//D3 multi root analysis tree

/**
*
*/
function MultiRootAnalysisTree(chartSelector, data, config) {
  //internal members
  var thisTree = this;
  var baseSvg = null;
  var _roots,_rootHairs, _seed, _nodes, _leaves, _fruits;
  var _spruit, _branches;
  var _depth;
  var _chart, _data, _config; // array of { from: node, to: node }
  var _minFruitCScore, _maxFruitCScore, _minRootScore, _maxRootScore;
  // panning variables
  var panSpeed = 200;
  var panBoundary = 20; // Within 20px from edges will pan when dragging.
  var svgGroup = null;
  /**
  *@desc find the root by name
  */
  function findRoot(rootName) {
    for(var i=0; i<_roots.length; i++) {
      if(_roots[i].name === rootName) {
        return _roots[i];
      }
    }
    return null;
  }
  /**
  *@desc shuffles an array
  */
  function arrayShuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;
    while (0 !== currentIndex) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }
    return array;
  }
  /**
  *@desc does the same as jQuery.extend or angular.extend
  */
  function extend(dst, src) {
    var keys;
    keys = Object.keys(src || {});
    for(var i=0; i<keys.length; i++) {
      dst[keys[i]] = src[keys[i]];
    }
    return dst;
  }

  /**
  *@desc Return endpoint of branch
  */
  function endPt(b) {
    var x = b.node0.x + b.l * Math.sin( b.a );
    var y = b.node0.y - b.l * Math.cos( b.a );
    return {x: x, y: y};
  }

  // Tree creation functions
  function branch(b) {
    if(typeof b.node1.children !== 'undefined' && Array.isArray(b.node1.children)) {
      b.node1.children.forEach(function(child, idx, siblings) {
        var daR = _config.ar * (Math.random() - 0.5);
        var newB = {
          parent: b.i,
          node0: b.node1,
          node1: child,
          i: _branches.length,
          a: b.a + ( siblings.length>1 ? (_config.da * 2 / (siblings.length-1)) * idx - _config.da : 0) + daR,
          l: b.l * _config.dl,
          d: b.d + 1
        };
        var end = endPt(newB);
        child.x = end.x;
        child.y = end.y;
        _branches.push(newB);
        branch(newB);
      });
    }
  }

  function _makeRootHairs(h) {
    if(h.d + 1 > h.r.dMax) {
      return;
    }
    var siblings = _config.maxChildrenPerNode;
    for(var ch=0;ch<siblings;ch++) {
      var daR = _config.ar * (Math.random() - 0.5);
      var nh = {
        parent: h,
        r: h.r,
        a: h.a + (Math.random() / 2 + 1) * Math.sign(Math.random()-0.5) * (ch % 2) + daR,
        l: h.l * _config.dl,
        d: h.d + 1,
        x1: h.x2,
        y1: h.y2
      };
      nh.x2 = nh.x1 + nh.l * Math.cos( nh.a );
      nh.y2 = nh.y1 + nh.l * Math.sin( nh.a );
      nh.y2 = (nh.y2<_seed.y) ? _seed.y+(_seed.y - nh.y2) : nh.y2;
      _rootHairs.push(nh);
      _makeRootHairs(nh);
    }
  }

  function roots() {
    var dMax = Math.floor((_maxRootScore - _minRootScore) * _config._rootSizeRatio + _config.minRootSize);
    var sL = Math.min(_config.width / 2 / _sumOfSeries(1, _config.dl, dMax-4), _config.height / 4 / _sumOfSeries(1, _config.dl, dMax-3));
    _roots.forEach(function(r, idx, siblings){
      r.aMin = 3.14 / siblings.length * (idx + 1);
      r.aMax = 3.14 / siblings.length * (idx + 1);
      r.dMax = Math.floor((r.value - _minRootScore) * _config._rootSizeRatio + _config.minRootSize);
      r.r = r;
      r.a = 3.14 / siblings.length * idx + ( 3.14 / siblings.length * Math.random());
      r.l = sL;
      r.d = 1;
      r.x1 = _seed.x;
      r.y1 = _seed.y;
      r.x2 = r.x1 + r.l * Math.cos( r.a );
      r.y2 = r.y1 + r.l * Math.sin( r.a );
      _rootHairs.push(r);
      _makeRootHairs(r);
    });
  }

  /**
  *@desc Highlights Parent branches, Fruits, and Roots
  */
  function _highlightParents0(e, d) {
    var colour = (e === 'mouseover' ? 'green' : '#777');
    var depth = d.d;
    for(var i = 0; i <= depth; i++) {
      d3.select('#branch-id-'+parseInt(d.i))
      .style('stroke', colour);
      d = _branches[d.parent];
    }
  }
  function _highlightFruit0(e, d) {
    var fruitName = (e === 'mouseover' ? d.name + ' cSize:' + d.size : '');
    var f,t;
    f = d3.select('#fruit-id-'+parseInt(d.i));
    t = d3.select('text.fruit-name')
    .text(fruitName)
    .style('font-size', '5px')
    .style('stroke', d.root.color)
    .style('fill', d.root.color)
    .transition()
    .ease('elastic')
    .duration('500')
    .style('font-size', '18px');
    //highlight the parent branches;
    for(var i=0;i<_branches.length;i++) {
      if(_branches[i].node1 === d) {
        _highlightParents0(e, _branches[i]);
      }
    }
    //highlight the root
    _highlightRoot0(e, d.root);
  }
  function _highlightRoot0(e, d) {
    var rootColor = (e === 'mouseover' ? d.r.color : '#777');
    var rootName = (e === 'mouseover' ? 'Category:'+ d.r.name + ' Score:'+d.r.value : '');

    d3.selectAll('path.root#root-'+d.r.name)
    .transition()
    .ease('elastic')
    .duration('400')
    .style('stroke', rootColor);
    d3.select('text.root-name')
    .text(rootName)
    .style('font-size', '12px')
    .style('stroke', d.r.color)
    .style('fill', d.r.color)
    .transition()
    .ease('elastic')
    .duration('500')
    .style('font-size', '18px');
  }

  function highlightParents(d) {
    _highlightParents0(d3.event.type, d);
  }
  function highlightFruit(d) {
    _highlightFruit0(d3.event.type, d);
  }
  function highlightRoot(d) {
    _highlightRoot0(d3.event.type, d);
  }

  function _sumOfSeries(s, q, n) {
    return ((1 - Math.pow(q, n)) / (1-q)) * s;
  }


  // TODO: Pan function, can be better implemented.

  function pan(domNode, direction) {
    var speed = panSpeed;
    if (panTimer) {
      clearTimeout(panTimer);
      translateCoords = d3.transform(svgGroup.attr("transform"));
      if (direction == 'left' || direction == 'right') {
        translateX = direction == 'left' ? translateCoords.translate[0] + speed : translateCoords.translate[0] - speed;
        translateY = translateCoords.translate[1];
      } else if (direction == 'up' || direction == 'down') {
        translateX = translateCoords.translate[0];
        translateY = direction == 'up' ? translateCoords.translate[1] + speed : translateCoords.translate[1] - speed;
      }
      scaleX = translateCoords.scale[0];
      scaleY = translateCoords.scale[1];
      scale = zoomListener.scale();
      svgGroup.transition().attr("transform", "translate(" + translateX + "," + translateY + ")scale(" + scale + ")");
      d3.select(domNode).select('g.node').attr("transform", "translate(" + translateX + "," + translateY + ")");
      zoomListener.scale(zoomListener.scale());
      zoomListener.translate([translateX, translateY]);
      panTimer = setTimeout(function() {
        pan(domNode, speed, direction);
      }, 50);
    }
  }

  // Define the zoom function for the zoomable tree

  function zoom() {
    svgGroup.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
  }


  // define the zoomListener which calls the zoom function on the "zoom" event constrained within the scaleExtents
  var zoomListener = d3.behavior.zoom().scaleExtent([0.1, 3]).on("zoom", zoom);


  //public members
  this.init = function() {
    _config = {
      balance: 1, //0~1 : indicates how balanced the tree is
      maxChildrenPerNode: 2, //>=2 :maximum number of children per node
      da : 0.5, // Angle delta
      dl : 0.8, // Length delta (factor)
      ar : 0.7, // Randomness
      width: 850,
      height: 800,
      minFruitSize: 4,
      maxFruitSize: 14,
      _fruitSizeRatio: 1,
      maxRootSize: 9,
      minRootSize: 1,
      _rootSizeRatio: 1,
    };
    _roots = null; // the root nodes of the tree
    _rootHairs = [];
    _seed = { type: 'node', children: [],  x: _config.width / 2, y: _config.height / 2 }; // a = angle, l = length, d = depth
    _nodes = []; // array of all up-ground nodes : { type: enum of 'node'|'leaf'|'fruit', children:[] , root:, parent: , ... }
    _branches = []; // array of { from: node, to: node }
    _spruit = { node0:_seed, node1: _seed, i: 0, a: 0, l: 130, d:0 };
    _leaves = [];
    _fruits = [];
    _depth = 0;
    _minFruitCScore = 0;
    _maxFruitCScore = 0;
    _minRootScore = 0;
    _maxRootScore = 0;
  };

  /**
  *@desc this will generate tree's nodes based on the input data
  */
  this.generateTree = function() {
    if(_data === null) {
      return false;
    }
    var i, node, level, level1, children, idx;
    //generate roots
    _roots = _data.categories;
    _minRootScore = d3.min(_data.categories, function(r) { return r.value; });
    _maxRootScore = d3.max(_data.categories, function(r) { return r.value; });
    _config._rootSizeRatio = (_config.maxRootSize - _config.minRootSize) / (_maxRootScore - _minRootScore);

    //add fruits to leaf-level
    _data.cScores.forEach(function(fruit, idx) {
      node = {
        i: idx,
        type: 'fruit',
        name: fruit.name,
        size: fruit.cSize,
        root: findRoot(fruit.cCategory)
      };
      _fruits.push(node);
    });
    _minFruitCScore = d3.min(_fruits, function(f) { return f.size; });
    _maxFruitCScore = d3.max(_fruits, function(f) { return f.size; });
    _config._fruitSizeRatio = (_config.maxFruitSize - _config.minFruitSize) / (_maxFruitCScore - _minFruitCScore);
    //generate leaves based on the number of _data.iScore
    var leavesCount = _data.iScore - _data.cScores.length;
    for(i=0; i<leavesCount; i++) {
      node = { i: i, type: 'leaf' };
      _leaves.push(node);
    }
    //Build the balanced tree
    level = _fruits.concat(_leaves);
    level = arrayShuffle(level);

    while(level.length>1) {
      level1 = [];
      _depth ++;
      idx = 0;
      while(idx < level.length) {
        node = { type:'node', children:[] };
        if(Math.random() < _config.balance) {
          children = _config.maxChildrenPerNode;
        } else {
          children = Math.ceil( Math.random() * _config.maxChildrenPerNode );
        }
        children = ((idx + children) >= level.length ? level.length - idx : children);
        for(i=idx; i<idx+children; i++) {
          level[i].parent = node;
          node.children.push(level[i]);
        }
        idx += children;
        level1.push(node);
        _nodes.unshift(node);
      }
      level = arrayShuffle(level1);
    }
    _spruit.l = Math.min(_config.width / 2 / _sumOfSeries(1, _config.dl, _depth-4), _config.height / 4 * 3 / _sumOfSeries(1, _config.dl, _depth-3));
    if(level.length === 1) {
      _seed.children = level;
      var end = endPt(_spruit);
      _seed.children[0].x = end.x;
      _seed.children[0].y = end.y;
      _spruit.node1 = _seed.children[0];
      _branches.push(_spruit);
    } else {
      _seed.children = [];
    }
  };

  /**
  *@desc draw the tree
  */
  this.draw = function( initialize ) {
    _branches = [_spruit];
    _rootHairs = [];
    branch(_spruit);
    roots();
    var baseSvg = d3.select(_chart)
      .attr('width', _config.width)
      .attr('height', _config.height);
    var b, f, fIcon, r, svg;

    var rootDiagonal = d3.svg.diagonal()
    .projection(function(d) { return [d.x, d.y]; })
    .source(function(d) { return {x:d.x1, y:d.y1}; })
    .target(function(d) { return {x:d.x2, y:d.y2}; });
    var branchDiagonal = d3.svg.diagonal()
    .projection(function(d) { return [d.x, d.y]; })
    .source(function(d) { return {x:d.node0.x, y:d.node0.y}; })
    .target(function(d) { return {x:d.node1.x, y:d.node1.y}; });

    if(initialize) {
      svg = baseSvg.append("g")
        .attr('class', 'tree');
      svg.append('rect')
      .attr('x', 0).attr('y', _seed.y)
      .attr('width', _config.width).attr('height', _config.height)
      .attr('class', 'ground');
      svg.append('text')
      .attr('text-anchor', 'end')
      .attr('class', 'root-name')
      .attr('x', _seed.x-50)
      .attr('y', _seed.y-20);
      svg.append('text')
      .attr('text-anchor', 'end')
      .attr('class', 'fruit-name')
      .attr('x', _config.width-50)
      .attr('y', 20);
      //root
      r = svg.selectAll('.root')
      .data(_rootHairs)
      .enter()
      .append('path')
      .attr('class', 'root')
      .attr('id', function(d) { return 'root-'+d.r.name; })
      .attr('d', rootDiagonal)
      .style('stroke-width', function(d) { return Math.pow(d.r.dMax-d.d, 1.2)+1;})
      .on('mouseover', highlightRoot)
      .on('mouseout', highlightRoot);

      //branch
      b = svg.selectAll('.branch')
      .data(_branches)
      .enter()
      .append('path')
      .attr('class', 'branch')
      .attr('d',branchDiagonal)
      .attr('id', function(d) {return 'branch-id-'+d.i;})
      .style('stroke-width', function(d) { return Math.pow(_depth-d.d, 1.5)+1;})
      .on('mouseover', highlightParents)
      .on('mouseout', highlightParents);
      //Fruits
      f = svg.selectAll('.fruit')
      .data(_fruits)
      .enter().append('g')
      .attr('class', 'fruit')
      .attr('id', function(d) {return 'fruit-id-'+d.i;})
      .on('mouseover', highlightFruit)
      .on('mouseout', highlightFruit);

      //Apple Icon
      fIcon = f.append('g')
      .attr('transform', function(d) {
        var scale = ((d.size-_minFruitCScore)*_config._fruitSizeRatio + _config.minFruitSize) / _config.maxFruitSize / 2;
        return 'matrix(' + scale +' ,0,0,' + scale + ', ' + (-65 * scale + d.x) + ', ' + (-20 * scale + d.y) + ')';
      });
      fIcon.append('path')
      .attr('d', 'M60.75,33.92c-10.86-1.41-21.57-4.02-31.69,2.28c-9.45,5.9-16.69,15.98-19.45,26.75   c-3.9,15.23-1.58,32.57,8.83,44.77c5.72,6.69,15.23,13.81,23.73,16.47c21.82,6.82,48.79,3.58,62.48-16.74   c3.91-5.8,7.83-13.66,9.26-20.55c4.01-19.26-0.48-41.83-20.42-50.12c-8.88-3.69-18.37-1.66-27.65-2.33   C64.14,34.33,62.44,34.14,60.75,33.92z')
      .attr('fill', function(d) { return d.root.color; });
      fIcon.append('path')
      .attr('d', 'M59.02,50.25c-2.34-0.5-4.62-1.33-6.76-2.38c-1.12-0.55-4.36-3.13-4.69-0.42   c-0.42,3.27,4.09,6.09,6.33,7.14c3.86,1.82,8.18,2.47,12.33,1.63c3.99-0.81,7.41-2.78,9.97-6.24c0.32-0.45,0.55-0.98,0.71-1.48   c0.57-1.81-1.41-1.83-2.47-1.32c-0.86,0.41-1.6,1.07-2.46,1.48c-1.64,0.79-3.36,1.43-5.11,1.77   C64.26,50.92,61.61,50.79,59.02,50.25z')
      .attr('fill', '#2F2F2F');
      fIcon.append('path')
      .attr('d', 'M39.17,43.59c-1.28-1.72-4.79-1.88-7.29-1.03c-3.09,1.06-5.84,3.36-7.77,5.97   c-1.66,2.24-4.1,6.94-1.69,9.51c1.18,1.25,2.61,0.76,3.97,0.08c2.46-1.23,3.96-3.92,6.04-5.65C34.57,50.7,42.15,47.52,39.17,43.59z')
      .attr('fill', '#FFF');
      fIcon.append('path')
      .attr('d', 'M39.17,43.59c-1.28-1.72-4.79-1.88-7.29-1.03c-3.09,1.06-5.84,3.36-7.77,5.97   c-1.66,2.24-4.1,6.94-1.69,9.51c1.18,1.25,2.61,0.76,3.97,0.08c2.46-1.23,3.96-3.92,6.04-5.65C34.57,50.7,42.15,47.52,39.17,43.59z')
      .attr('fill', '#FFF');
      fIcon.append('path')
      .attr('d', 'M71.41,21.92c-0.07-0.26-0.2-0.49-0.39-0.64c-0.4-0.31-1.23-0.62-1.7-0.79      c-0.71-0.27-1.47-0.38-2.21-0.38c-0.28,0-0.55,0.01-0.81,0.04c-1,0.12-1.86,0.49-2.43,1.3c-0.76,1.05-0.63,2.24-0.83,3.46      c-0.28,1.74-1.1,3.32-1.55,5.02c-0.35,1.31-0.63,2.64-0.88,3.98c-0.19,0.98-0.35,1.96-0.47,2.95      c-0.43,3.67-1.03,7.34-0.87,11.05c0.01,0.51,0.03,1.02,0.06,1.53c0.01,0.26,0.04,0.51,0.08,0.77c0.06,0.34,0.08,0.73,0.12,1.12      c0.02,0.14,0.03,0.28,0.05,0.42c0.11,0.6,0.32,1.16,0.89,1.47c0.72,0.4,1.55,0.58,2.39,0.59c0.26,0,0.52-0.04,0.77-0.06      l0.66-0.04c0.32-0.09,0.65-0.21,0.98-0.3c0.53-0.13,1.05-0.4,1.42-0.81c0.33-0.37,0.37-0.75,0.35-1.19      c-0.01-0.1-0.02-0.2-0.03-0.31c-0.04-0.39-0.07-0.79-0.09-1.19c-0.05-0.79-0.07-1.6-0.09-2.39c-0.06-1.78-0.03-3.58,0.13-5.36      c0.11-1.06,0.16-2.14,0.25-3.2c0.11-1.48,0.32-2.95,0.57-4.42c0.06-0.31,0.09-0.61,0.15-0.91c0.36-1.88,1.03-3.57,1.75-5.35      c0.33-0.82,0.47-1.69,0.77-2.48c0.33-0.82,1.06-1.27,1.06-2.25C71.51,23.09,71.56,22.44,71.41,21.92z')
      .attr('fill', '#855C52');
    } else { //transition
      svg = baseSvg.select("g.tree");
      //root
      r = svg.selectAll('.root')
      .data(_rootHairs)
      .transition()
      .attr('d', rootDiagonal);
      //branch
      b = svg.selectAll('.branch')
      .data(_branches)
      .transition()
      .attr('d',branchDiagonal);
      //fruit
      f = svg.selectAll('.fruit')
      .data(_fruits)
      .transition();
      fIcon = f.select('g')
      .attr('transform', function(d) {
        var scale = ((d.size-_minFruitCScore)*_config._fruitSizeRatio + _config.minFruitSize) / _config.maxFruitSize / 2;
        return 'matrix(' + scale +' ,0,0,' + scale + ', ' + (-65 * scale + d.x) + ', ' + (-20 * scale + d.y) + ')';
      });
    }
  };

  //initializing by parameters
  this.init();
  _chart = chartSelector;
  _data = data;
  _config = extend(_config, config);
  _seed.x = _config.width / 2;
  _seed.y = _config.height / 3 * 2;
  this.generateTree();

}
