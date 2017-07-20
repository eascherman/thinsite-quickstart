
import {obs, install, on, map, bundle} from '../node_modules/thinsite/exports.js';
import {default as http} from './source/http.js';



let state = {};
obs(state, 'cows');

let loadCows = () => state.cows = http.get('cows');
loadCows();

function deleteCow(cow) {
    let name = encodeURIComponent(cow);
    http.delete('cows/' + name)
        .then(loadCows);
}

let newCowInput;
function addCow() {
    let name = encodeURIComponent(newCowInput.value);
    if (name) {
        http.post('cows/' + name)
            .then(loadCows);
        newCowInput.value = '';
    }
}

let content = bundle
    `<h1>Farmer John's Cows</h1>

    ${() => map(state.cows, cow => bundle
        `<p>
            ${cow}
            <button ${on.click(() => deleteCow(cow))}>x</button>
        </p>`
    )}
    
    <input ${el => newCowInput = el} placeholder="new cow"
        ${on.keydown.enter(addCow)} />
    <button ${on.click(addCow)}>add</button>`;

install(content, document.body);