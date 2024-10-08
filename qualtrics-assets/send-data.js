// /qualtrics-assets/send-data.js

// Initialize
let parentOrigin;

const dataToSend = {
  quizType: '${e://Field/quizType}',
  responseId: '${e://Field/ResponseID}',
  recordedDate: '${date://CurrentDate/c}',
  totalScore: '${gr://SC_4OW9P7VDYuDLVbw/Score}',
  pointArray: [
    /* q01 */ '${q://QID3/SelectedChoicesRecode}',
    /* q02 */ '${q://QID4/SelectedChoicesRecode}',
    /* q03 */ '${q://QID5/SelectedChoicesRecode}',
    /* q04 */ '${q://QID6/SelectedChoicesRecode}',
    /* q05 */ '${q://QID7/SelectedChoicesRecode}',
    /* q06 */ '${q://QID8/SelectedChoicesRecode}',
    /* q07 */ '${q://QID10/SelectedChoicesRecode}', // Q7 was created 10th
    /* q08 */ '${q://QID9/SelectedChoicesRecode}', // Q8 was created 9th
    /* q09 */ '${q://QID11/SelectedChoicesRecode}',
    /* q10 */ '${q://QID13/SelectedChoicesRecode}', // Q10 was created 13th
    /* q11 */ '${q://QID12/SelectedChoicesRecode}', // Q11 was created 12th
    /* q12 */ '${q://QID14/SelectedChoicesRecode}',
  ]
};


Qualtrics.SurveyEngine.addOnReady(
  function() {
    /*Place your JavaScript here to run when the page is fully displayed*/
    // Listen for the response from the parent window
    window.addEventListener("message",
      (event) => {
        // Check if the received message is the origin response
        if (event.data.type === "originResponse") {
          // Log the received parent origin
          console.log("Parent origin:", event.data.origin);

          parentOrigin = event.data.origin;
        }
      }
    );

    // Send a message to the parent window requesting the origin
    window.parent.postMessage("getParentOrigin", "*");
  }
);

Qualtrics.SurveyEngine.addOnPageSubmit(
  function(type) {
    if (type == 'next') {
      /*Place your JavaScript here to run when the page is submitted*/
      window.parent.postMessage(JSON.stringify(dataToSend), parentOrigin);
    }
  }
);
