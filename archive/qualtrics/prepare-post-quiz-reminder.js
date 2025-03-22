function codeTask() {
    /* Process data for post-quiz reminder */
    /* Beware: Piped text of empty array is empty string */
    const unixTimes = JSON.parse(`~{aed://time}` || '[]');
    const largest = Math.max(...unixTimes);
    const latestDate = new Date(largest);
    const latestDateString = latestDate.toLocaleString('en-AU', {
        timeZone: 'Australia/Melbourne',
        timeZoneName: 'short',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });  // display timestamp in Melbourne time
    return {
        latestDate,
        latestDateString,
    };  // return custom object
}
