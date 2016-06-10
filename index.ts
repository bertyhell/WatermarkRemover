let jimp = require("jimp");
let _ = require('lodash');
let fs = require("fs");
let async = require("async");

class WatermarkImage {
  public image: string;
  public preview: string;
  public imagePixels: number[][];

  constructor() {
    this.imagePixels = [];
  }
}

let dir = 'C:/Users/verhe/Documents/WatermarkRemover/spartan/photos/main';

let images: WatermarkImage[] = [];

let files = fs.readdirSync(dir);
for (var i=0; i<files.length; i++) {
  let file = files[i];
  let id = parseInt(file);
  if (!images[id]) {
    images[id] = new WatermarkImage();
  }
  if (_.includes(file, 'preview')) {
    images[id].preview = file;
  } else {
    images[id].image = file;
  }
}

images = _.filter(images, function(img: WatermarkImage) {
  return !!img;
});

var width: number = 0;
var height: number = 0;

async.each(images,
  function(wImg: WatermarkImage, callback: Function) {
    jimp.read(dir + wImg.image, function (err: any, img: any) {
      if (err) throw err;
      width = img.bitmap.width;
      height = img.bitmap.height;
      img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x: number, y: number, idx: number) {
        // x, y is the position of this pixel on the image
        // idx is the position start position of this rgba tuple in the bitmap Buffer
        // this is the image

        // var red   = this.bitmap.data[ idx ];
        // var green = this.bitmap.data[ idx + 1 ];
        // var blue  = this.bitmap.data[ idx + 2 ];
        // var alpha = this.bitmap.data[ idx + 3 ];

        wImg.imagePixels.push([
          this.bitmap.data[idx],
          this.bitmap.data[idx + 1],
          this.bitmap.data[idx + 2],
          this.bitmap.data[idx + 3]
        ]);

        // rgba values run from 0 - 255
        // e.g. this.bitmap.data[idx] = 0; // removes red from this pixel
      });
      callback();
    });
  },
  function(err: any){
    let outputPixels: number[][] = [];

    // Walk over every pixel
    for (var i = 0; i<images[0].imagePixels.length ; i++) {
      let channelVariances: number[] = [];

      // Walk over rgb channels
      for (var j = 0; j<3 ; j++) {
        // Walk over every image
        let channelValues: number[] = [];
        for (var k = 0; k<images.length; k++) {
           channelValues.push(images[k].imagePixels[i][j]);
        }
        channelVariances.push(getVariance(channelValues));
      }
      // console.log(_.max(channelVariances));
      if (_.max(channelVariances) < 200) {
        // Output average pixel color to new image
        outputPixels.push([255, 255, 255, 255]);
      } else {
        // output transparent pixel to new image
        outputPixels.push([images[0].imagePixels[0][0], images[0].imagePixels[0][1], images[0].imagePixels[0][2], 255 - Math.min(255, getAverage(channelVariances))]);
      }
    }
    new jimp(width, height, function (err: any, outputImg: any) {
      outputImg.scan(0, 0, outputImg.bitmap.width, outputImg.bitmap.height, function (x: number, y: number, idx: number) {
        // x, y is the position of this pixel on the image
        // idx is the position start position of this rgba tuple in the bitmap Buffer
        // this is the image

        // var red   = this.bitmap.data[ idx ];
        // var green = this.bitmap.data[ idx + 1 ];
        // var blue  = this.bitmap.data[ idx + 2 ];
        // var alpha = this.bitmap.data[ idx + 3 ];


        this.bitmap.data[idx]     = outputPixels[y*width+x][0];
        this.bitmap.data[idx + 1] = outputPixels[y*width+x][1];
        this.bitmap.data[idx + 2] = outputPixels[y*width+x][2];
        this.bitmap.data[idx + 3] = outputPixels[y*width+x][3];

        // rgba values run from 0 - 255
        // e.g. this.bitmap.data[idx] = 0; // removes red from this pixel
      });

      outputImg.write(dir + "output.png");
    });

    console.log('done');
  }
);



function getAverage(numbers: number[]) {
  var sum = 0;

  for(var i= 0; i< numbers.length; i++) {
    sum += numbers[i];
  }
  return sum / numbers.length;
}

function getVariance(numbers: number[]): number {
  var average = getAverage(numbers);
  var variance = 0;
  for(var i= 0; i< numbers.length; i++) {
    variance += Math.pow((numbers[i] - average), 2);
  }
  return variance / numbers.length;
}





// var synaptic = require('synaptic');
// var getPixels = require("get-pixels");
//
// var Neuron    = synaptic.Neuron,
//     Layer     = synaptic.Layer,
//     Network   = synaptic.Network,
//     Trainer   = synaptic.Trainer,
//     Architect = synaptic.Architect;
//
//
// getPixels("C:/Users/verhe/Documents/fallout hacker/img/standardized img/001.jpg", function(err: any, pixels: any) {
//   if (err) {
//     console.log("Bad image path");
//     return
//   }
//   console.log("got pixels", pixels.shape.slice());
//   console.log("got pixels", pixels);
// });
//
//
//
// // create the network
// var inputLayer = new Layer(2);
// var hiddenLayer = new Layer(3);
// var outputLayer = new Layer(1);
//
// inputLayer.project(hiddenLayer);
// hiddenLayer.project(outputLayer);
//
// var myNetwork = new Network({
//   input: inputLayer,
//   hidden: [hiddenLayer],
//   output: outputLayer
// });
//
// // train the network
// var learningRate = .3;
// for (var i = 0; i < 5000; i++)
// {
//   // 0,0 => 0
//   myNetwork.activate([0,0]);
//   myNetwork.propagate(learningRate, [0]);
//
//   // 0,1 => 1
//   myNetwork.activate([0,1]);
//   myNetwork.propagate(learningRate, [1]);
//
//   // 1,0 => 1
//   myNetwork.activate([1,0]);
//   myNetwork.propagate(learningRate, [1]);
//
//   // 1,1 => 0
//   myNetwork.activate([1,1]);
//   myNetwork.propagate(learningRate, [0]);
// }
//
//
// // test the network
// console.log(myNetwork.activate([0,0])); // [0.015020775950893527]
// console.log(myNetwork.activate([0,1])); // [0.9815816381088985]
// console.log(myNetwork.activate([1,0])); // [0.9871822457132193]
// console.log(myNetwork.activate([1,1])); // [0.012950087641929467]











