'use strict';
var tree1, tree2, tree3;

d3.json('data.json', function(error, data){
  tree1 = new MultiRootAnalysisTree('.container#container-1 .chart-new', data[0], { maxChildrenPerNode: 2, minFruitSize: 3, maxFruitSize: 9 });
  tree1.draw(true);
  
  tree2 = new MultiRootAnalysisTree('.container#container-2 .chart-new', data[1], { maxChildrenPerNode: 2, minFruitSize: 3, maxFruitSize: 9 });
  tree2.draw(true);

  tree3 = new MultiRootAnalysisTree('.container#container-3 .chart-new', data[2], { maxChildrenPerNode: 2, minFruitSize: 3, maxFruitSize: 9 });
  tree3.draw(true);
});

d3.selectAll('.container#container-1 .regenerate')
	.on('click', function() {
    //regenerate();
    tree1.draw();
  });


d3.selectAll('.container#container-2 .regenerate')
	.on('click', function() {
    //regenerate();
    tree2.draw();
  });

d3.selectAll('.container#container-3 .regenerate')
	.on('click', function() {
    //regenerate();
    tree3.draw();
  });

