// async function currentTab() {
//     const options = {
//         active: true,
//         currentWindow: true
//     };
//
//     // Get current active tab.
//     const tabs = await browser.tabs.query(options);
//
//     // Reject promise if there is no or more than one tab.
//     if(tabs.length !== 1) throw new Error('Number of active tab incorrect.');
//
//     return tabs[0];
// }

async function donwloadData(data) {
    const blob = new Blob([JSON.stringify(data, null, '\t')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    await browser.downloads.download({
        url: url,
        filename: 'data.json'
    });
}

function wait(delay) {
    return new Promise(resolve => {
        setTimeout(resolve, delay);
    });
}

async function extractData(tree, tabId) {
    return await browser.tabs.sendMessage(tabId, {
        action: 'extract',
        tree: tree
    });
}

async function nextPage(data, tabId) {
    return await browser.tabs.sendMessage(tabId, {
        action: 'next',
        next: data
    });
}

function singlePage(template, tabId) {
    extractData(template.tree, tabId)
    .then(data => donwloadData(data))
    .catch(error => console.error(error));
}

function allPages(template, tabId) {
    let data = [];

    new Promise((resolve, reject) => {
        function extractPage() {
            wait(1000)
            .then(() => extractData(template.tree, tabId))
            .then(chunk => data.push(chunk))
            .then(() => nextPage(template.next, tabId))
            .then(success => {
                if(!success) {
                    chrome.webRequest.onCompleted.removeListener(extractPage);
                    resolve(data);
                }
            })
            .catch(error => {
                chrome.webRequest.onCompleted.removeListener(extractPage);
                reject(error);
            });
        }

        chrome.webRequest.onCompleted.addListener(extractPage, { urls: [template.url + template.next.request + '*'] });
        extractPage();
    })
    .then(data => {
        return donwloadData(data);
    })
    .catch(error => {
        console.error(error);
    });
}
