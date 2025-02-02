function codeTask() {
    // const fetchedResponseHistory = ~{ch://XXXX_xxxx/$.user_metadata.responseHistory};  // qualtrics piped text (censored)
    fetchedResponseHistory.push({
        preId: '${rm://Field/ResponseID}'
    });
    return { newData: { responseHistory: fetchedResponseHistory } };
}
