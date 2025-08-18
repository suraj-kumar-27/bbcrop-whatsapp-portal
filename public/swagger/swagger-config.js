const originalFetch = window.fetch;

window.fetch = function (url, options) {

    const token = localStorage.getItem('token');
    if (token) {
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        };
    }

    return originalFetch(url, options)
        .then(response => {
            if (url.endsWith('/api/v1/user/login')) {
                return response.clone().json().then(data => {
                    if (data.error === "true") {
                        console.error("API Error:", data.message || "Unknown error");
                    } else if (data.error === "false") {
                        if (data.hasOwnProperty("data")) {
                            if (data.data.hasOwnProperty("token")) {
                                let token = "Bearer " + data.data.token;
                                localStorage.setItem('token', data.data.token);
                                const tokenInput = document.getElementById("api_key_value");
                                const authorizeButton = document.querySelector('.btn.authorize.unlocked');

                                if (authorizeButton) {
                                    authorizeButton.click();
                                    navigator.clipboard.writeText(token)
                                        .then(() => {
                                            console.log("Token copied to clipboard.");
                                        })
                                        .catch(err => {
                                            console.error("Failed to copy token to clipboard:", err);
                                        });
                                } else {
                                    console.warn("Authorize button not found.");
                                }
                            }
                        }
                    }
                    return response;
                }).catch(err => {
                    console.error("Failed to parse JSON:", err);
                    return response;
                });
            } else {
                return response;
            }
        })
        .catch(err => {
            console.error("Fetch error:", err);
            throw err;
        });
};
