function codeTask() {
    const preId = '${e://Field/preResponseId}';
    // const fetchedResponseHistory = ~{ch://XXXX_xxxx/$.user_metadata.responseHistory};  // qualtrics piped text (censored)
    for (const cycle of fetchedResponseHistory) {
        if (preId === cycle.preId) {
            cycle.postId = '${rm://Field/ResponseID}';
            break;
        }
    }
    return { newData: { responseHistory: fetchedResponseHistory } };
}
