function codeTask() {
    let fetchedResponseHistory;
	try {
        fetchedResponseHistory = ~{ch://XXXX_xxxx/$.user_metadata.responseHistory};  // qualtrics piped text syntax (censored)
	} catch(historyError) {
        console.error(historyError);
        console.warn('Response history may be undefined!');
        fetchedResponseHistory = [];
    }
    fetchedResponseHistory.push({
        preId: '${rm://Field/ResponseID}'  // qualtrics piped text syntax
    });
    return { newData: { responseHistory: fetchedResponseHistory } };
}
