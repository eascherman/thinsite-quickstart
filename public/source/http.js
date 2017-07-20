
export default function http(reqType, endpoint, data) {
    return new Promise((resolve, reject) => {
        let xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
            if (this.readyState == 4) {
                if (this.status == 200) {
                    let json = this.responseText;
                    if (json) {
                        let obj = JSON.parse(json);
                        resolve(obj);
                    } else {
                        resolve(undefined);
                    }
                } else if (this.status != 200) {
                    reject(this.responseText);
                }
            }
        };
        reqType = reqType.toUpperCase();
        xhttp.open(reqType,  endpoint, true);
        if (data instanceof Object) {
            data = JSON.stringify(data);
        }
        xhttp.send(data);
    });
}

http.get = (endpoint) => http('GET', endpoint);
http.put = (endpoint, data) => http('PUT', endpoint, data);
http.post = (endpoint, data) => http('POST', endpoint, data);
http.delete = (endpoint, data) => http('DELETE', endpoint, data);