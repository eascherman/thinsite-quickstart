
import {obs, install, bundle, on, map} from '../exports.js';


class MyClass {
    constructor(message) {
        this.message = message || 'No message entered';
    }
    toContent() {
        return this.message;
    }
}


var state = {};             // an object we'll attach mutable values to
obs(state, 'text');         // let the change detector know the text property of the state object is mutable
obs(state, 'keystroke');


var content = bundle        // the bundle template literal tag is used to create markup content
    `<h3>Text: ${() => state.text}</h3>
    <input type="text" ${on.input(ev => state.text = ev.target.value)} />

    <h3>Array</h3>
    <ol>
        ${map([1,2,3], (n, i, arr) => bundle
            `<li>
                <button ${on.click(ev => arr.splice(i, 0, Math.random()))}>+</button>
                <button ${on.click(ev => arr.splice(i, 1))}>-</button>
                ${n}
            </li>`
        )}
    </ol>
    
    <h3>Promise</h3>
    <div>
        ${new Promise(function(resolve, reject) {
            setTimeout(() => resolve('Three seconds have passed!'), 3000);
        })}
    </div>

    <h3>Custom Object Rendering</h3>
    ${new MyClass('this is a custom object rendering')}
    
    <h3>Keystroke Listeners</h3>
    Try pressing backspace, s, or shift-s!
    <div>${() => state.keystroke && `You pressed ${state.keystroke}!`}</div>`;

on.keyup.backspace(() => state.keystroke = 'backspace')(document);
on.keydown.s(() => state.keystroke = 's')(document);
on.keydown.shift.s(() => state.keystroke = 'shift-s')(document);


install(content, document.body);
