let jimp = require("jimp");
var _ = require('lodash');
let fs = require("fs");
let async = require("async");
let synaptic = require('synaptic');

let mainDir = 'C:/Users/verhe/Documents/WatermarkRemover/spartan/';
let trainingDir = 'training-data/';
let realDir     = 'read-data/';

let watermarkDir = 'watermark/';
let thumbnailDir = 'thumbnail/';
let finalDir     = 'final/';

(function removeWatermarks() {

  // Load training data
  console.log('loading training data...');
  async.parallel({
      watermarks: function(callback: Function){
        getImagesInFolder(mainDir + trainingDir + watermarkDir, callback);
      },
      thumbnails: function(callback: Function){
        getImagesInFolder(mainDir + trainingDir + thumbnailDir, callback);
      },
      finals: function(callback: Function) {
        getImagesInFolder(mainDir + trainingDir + finalDir, callback);
      },
      finalDimensions: function(callback: Function) {
        getDimensions(mainDir + trainingDir + finalDir, callback);
      }
    },
    function(err: any, trainingImgInfo: {watermarks: number[][], thumbnails: number[][], finals: number[][], finalDimensions: {width: number, height: number}}) {

      // Create the neural net
      console.log('Creating neural net...');
      let brain = createNeuralNet(
        trainingImgInfo.watermarks[0].length + trainingImgInfo.thumbnails[0].length,
        trainingImgInfo.watermarks[0].length + trainingImgInfo.thumbnails[0].length,
        trainingImgInfo.finals[0].length);

      // Train the neural net
      console.log('Training neural net...');
      let learningRate = 2;
      for (var i = 0; i<trainingImgInfo.watermarks.length; i++) {
        console.log('learning image: ' + i);
        brain.activate(_.concat(trainingImgInfo.watermarks[i], trainingImgInfo.thumbnails[i]));
        brain.propagate(learningRate, trainingImgInfo.finals[i]);
      }

      // Load real testing data
      console.log('Loading real data...');
      async.parallel({
          watermarks: function(callback: Function){
            getImagesInFolder(mainDir + realDir + watermarkDir, callback);
          },
          thumbnails: function(callback: Function){
            getImagesInFolder(mainDir + realDir + thumbnailDir, callback);
          }
        },
        function(err: any, realImgInfo: {watermarks: number[][], thumbnails: number[][]}) {

          // Let the neural net do its magic
          console.log('Outputting final image...');
          let realFinalPixels = brain.activate(_.concat(realImgInfo.watermarks[0], realImgInfo.thumbnails[0]));
          outputImage(mainDir + realDir + '001.jpg', trainingImgInfo.finalDimensions.width, trainingImgInfo.finalDimensions.height, realFinalPixels);
          console.log('done');
        }
      );
    });
})();

/**
 * Output pixels to image file
 * @param path
 * @param width
 * @param height
 * @param pixels Array of numbers representing the rgb values one after the other in one dimension: r1, g1, b1, r2, g2, b2, r3, ...
 */
function outputImage(path: string, width: number, height: number, pixels: number[]) {
  new jimp(width, height, function (err: any, outputImg: any) {
    outputImg.scan(0, 0, outputImg.bitmap.width, outputImg.bitmap.height, function (x: number, y: number, idx: number) {
      // x, y is the position of this pixel on the image
      // idx is the position start position of this rgba tuple in the bitmap Buffer
      // this is the image
      let pixelIndex = (y*width+x) * 3;
      this.bitmap.data[idx]     = pixels[pixelIndex];
      this.bitmap.data[idx + 1] = pixels[pixelIndex + 1];
      this.bitmap.data[idx + 2] = pixels[pixelIndex + 2];

      // rgba values run from 0 - 255
      // e.g. this.bitmap.data[idx] = 0; // removes red from this pixel
    });

    outputImg.write(path);
  });
}

/**
 * Creates a neural net with the specified number of entry, hidden and output neurons
 */
function createNeuralNet(input: number, hidden: number, output: number): any {
  let Layer     = synaptic.Layer;
  let Network   = synaptic.Network;

  // create the network
  var inputLayer = new Layer(input);
  var hiddenLayer = new Layer(hidden);
  var outputLayer = new Layer(output);

  // Link the layers
  inputLayer.project(hiddenLayer);
  hiddenLayer.project(outputLayer);

  return new Network({
    input: inputLayer,
    hidden: [hiddenLayer],
    output: outputLayer
  });
}

/**
 * Gets dimension of first image in folder.
 * assumes that all images in folder are the same size
 * @param dir
 * @param callback
 */
function getDimensions(dir: string, callback: Function): void {
  let file = fs.readdirSync(dir)[0];

  jimp.read(dir + file, function (err: any, img: any) {
    if (err) throw err;
    callback(null, {width: img.bitmap.width, height: img.bitmap.height});
  });
}

function getImagesInFolder(dir: string, imgInFolderCb: Function): void {
  let files = fs.readdirSync(dir);
  let images: number[][] = [];

  async.eachSeries(files,
    function(file: string, asyncCallback: Function) {
      jimp.read(dir + file, function (err: any, img: any) {
        if (err) throw err;
        images.push(img.bitmap.data);
        process.stdout.write('.');
        // img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x: number, y: number, idx: number) {
        //   // x, y is the position of this pixel on the image
        //   // idx is the position start position of this rgba tuple in the bitmap Buffer
        //   // this is the image
        //
        //   imgPixels.push(this.bitmap.data[idx]);     // Red
        //   imgPixels.push(this.bitmap.data[idx + 1]); // Green
        //   imgPixels.push(this.bitmap.data[idx + 2]); // Blue
        //
        //   // rgba values run from 0 - 255
        //   // e.g. this.bitmap.data[idx] = 0; // removes red from this pixel
        // });

        // images[index] = imgPixels;
        asyncCallback();
      });
    },
    function(err: any){
      if (err) throw err;
      imgInFolderCb(null, images);
    }
  );
}
//
// var width: number = 0;
// var height: number = 0;
//
// async.each(images,
//   function(wImg: WatermarkImage, callback: Function) {
//     jimp.read(dir + wImg.image, function (err: any, img: any) {
//       if (err) throw err;
//       width = img.bitmap.width;
//       height = img.bitmap.height;
//       img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x: number, y: number, idx: number) {
//         // x, y is the position of this pixel on the image
//         // idx is the position start position of this rgba tuple in the bitmap Buffer
//         // this is the image
//
//         // var red   = this.bitmap.data[ idx ];
//         // var green = this.bitmap.data[ idx + 1 ];
//         // var blue  = this.bitmap.data[ idx + 2 ];
//         // var alpha = this.bitmap.data[ idx + 3 ];
//
//         wImg.imagePixels.push([
//           this.bitmap.data[idx],
//           this.bitmap.data[idx + 1],
//           this.bitmap.data[idx + 2],
//           this.bitmap.data[idx + 3]
//         ]);
//
//         // rgba values run from 0 - 255
//         // e.g. this.bitmap.data[idx] = 0; // removes red from this pixel
//       });
//       callback();
//     });
//   },
//   function(err: any){
//     let outputPixels: number[][] = [];
//
//     // Walk over every pixel
//     for (var i = 0; i<images[0].imagePixels.length ; i++) {
//       let channelVariances: number[] = [];
//
//       // Walk over rgb channels
//       for (var j = 0; j<3 ; j++) {
//         // Walk over every image
//         let channelValues: number[] = [];
//         for (var k = 0; k<images.length; k++) {
//            channelValues.push(images[k].imagePixels[i][j]);
//         }
//         channelVariances.push(getVariance(channelValues));
//       }
//       // console.log(_.max(channelVariances));
//       if (_.max(channelVariances) < 200) {
//         // Output average pixel color to new image
//         outputPixels.push([255, 255, 255, 255]);
//       } else {
//         // output transparent pixel to new image
//         outputPixels.push([images[0].imagePixels[0][0], images[0].imagePixels[0][1], images[0].imagePixels[0][2], 255 - Math.min(255, getAverage(channelVariances))]);
//       }
//     }
//     new jimp(width, height, function (err: any, outputImg: any) {
//       outputImg.scan(0, 0, outputImg.bitmap.width, outputImg.bitmap.height, function (x: number, y: number, idx: number) {
//         // x, y is the position of this pixel on the image
//         // idx is the position start position of this rgba tuple in the bitmap Buffer
//         // this is the image
//
//         // var red   = this.bitmap.data[ idx ];
//         // var green = this.bitmap.data[ idx + 1 ];
//         // var blue  = this.bitmap.data[ idx + 2 ];
//         // var alpha = this.bitmap.data[ idx + 3 ];
//
//
//         this.bitmap.data[idx]     = outputPixels[y*width+x][0];
//         this.bitmap.data[idx + 1] = outputPixels[y*width+x][1];
//         this.bitmap.data[idx + 2] = outputPixels[y*width+x][2];
//         this.bitmap.data[idx + 3] = outputPixels[y*width+x][3];
//
//         // rgba values run from 0 - 255
//         // e.g. this.bitmap.data[idx] = 0; // removes red from this pixel
//       });
//
//       outputImg.write(dir + "output.png");
//     });
//
//     console.log('done');
//   }
// );



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





// var getPixels = require("get-pixels");
//

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











