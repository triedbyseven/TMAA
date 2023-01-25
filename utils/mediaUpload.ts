import Papa from 'papaparse';

interface MediaUploadResponse {
  parseCSV: (file: File, callback: (results: Papa.ParseResult<unknown>) => void, callbackStep: (results: Papa.ParseStepResult<unknown>) => void) => void;
};

const MediaUpload = (): MediaUploadResponse => {
  const parseCSV = (
    file: File, 
    callback: (results: Papa.ParseResult<unknown>) => void,
    callbackStep: (results: Papa.ParseStepResult<unknown>) => void,
  ): void => {
    Papa.parse(file, {
      worker: true,
      step: callbackStep,
      complete: callback
      // step: function (row) {
        // console.log("Row:", row);
      // },
      // complete: function () {
        // console.log("All done!");
      // }
    });
  };

  return {
    parseCSV: parseCSV
  }
};

export default MediaUpload;