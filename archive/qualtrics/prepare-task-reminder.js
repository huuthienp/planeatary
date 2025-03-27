function codeTask() {
    /* Process data for task reminder or congratulations */
    /* Beware: Piped text of empty array is empty string */
    const chosen = JSON.parse(`~{aed://chosen}` || '[]');
    const done = JSON.parse(`~{aed://done}` || '[]');
    const pending = JSON.parse(`~{aed://pending}` || '[]');
    const chosenCount = chosen.length;
    const doneCount = done.length;
    const chosenCountText = chosenCount >= 2 ?
        chosenCount.toString() + '&nbsp;challenges' :
        chosenCount.toString() + '&nbsp;challenge';
    if (pending.length === 0) {
        const postQuizAnchor = '<a href="https://planeatary.netlify.app/qualtrics_post" target="_blank">Take Post-Quiz</a>';
        const moreTaskAnchor = '<a href="https://planeatary.netlify.app/manifesto_page" target="_blank">Select More Challenges</a>';
        pending.push(postQuizAnchor);
        pending.push(moreTaskAnchor);
    }  /* end of checking no pending challenge left */
    return {
        chosenCountText,
        doneCount: done.length,
        doneHtml: done.join('</li><li>'),
        pendingHtml: pending.join('</li><li>'),
        emailSubjectPrefix: chosenCount === doneCount ? 'Congratulations' : 'Update',
    };  // return custom object
}  /* end of code task */
