function codeTask() {
    const preId = '${e://Field/preResponseId}';
    /* qualtrics piped text (censored) */
    // const userRespHist = ~{ch://XXXX_xxxx/$.user_metadata.responseHistory};
    for (const cycle of userRespHist) {  // loop through cycles
        if (preId === cycle.preId && !cycle.postId) {
            // find the first cycle where pre-ID matches and post-ID is empty
            cycle.postId = '${rm://Field/ResponseID}';
            break;
        }  /* end of if cycle is found */
    }  /* end of loop */
    return { newData: { responseHistory: userRespHist } };
}
