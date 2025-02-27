function codeTask() {
    let userRespHist;
	try {  // qualtrics piped text may be empty, causing syntax error
        // userRespHist = ~{ch://XXXX_xxxx/$.user_metadata.responseHistory};
	} catch(syntaxErr) {
        console.error(syntaxErr);
        console.warn('Response history may be undefined!');
        userRespHist = [];
    }  /* end of try-catch */
    const preIdArr = userRespHist.map(cycle => cycle.preId);
    if (!preIdArr.includes('${rm://Field/ResponseID}')) {
        userRespHist.push({ preId: '${rm://Field/ResponseID}' });  // qualtrics piped text syntax
	}  /* end of if history already includes the new ID */
    return { newData: { responseHistory: userRespHist } };
}
