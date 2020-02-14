try {
    importScripts("verovio-toolkit-2.5.0.js");
    // importScripts('https://www.verovio.org/javascript/develop/verovio-toolkit-wasm.js');
} catch (e) {
    console.error(e);
}

// Check if we are in a web worker
if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {

    // Initializing an empty object to prevent if in onMessage listener the toolkit
    // is beeing accessed before Module.onRuntimeInitialized
    let verovioToolkit = {};

    // Wrapper class to allow to resolve a Promise outside of its scope
    class Deferred {
        constructor() {
            this.promise = new Promise((resolve, reject) => {
                this.reject = reject
                this.resolve = resolve
            });
        }
    }

    // Global deferred Promise that can be resolved when Module is initialized
    const moduleIsReady = new Deferred();

    // Create a new toolkit instance when Module is ready
    Module.onRuntimeInitialized = function () {
        verovioToolkit = new verovio.toolkit();
        moduleIsReady.resolve();
    };

    // Listen to messages send to this worker
    addEventListener('message', function (event) {
        // Destruct properties passed to this message event
        const { id, method, arguments } = event.data;

        // postMessage on a `onRuntimeInitialized` method as soon as
        // Module is initialized
        if(method === 'onRuntimeInitialized') {
            moduleIsReady.promise.then(() => {
                postMessage({
                    id,
                    method,
                    arguments,
                    result: null,
                }, event);
            });
            return;
        }

        // Check if verovio toolkit has passed method
        const fn = verovioToolkit[method || null];
        let result;
        if(fn) {
            // Call verovio toolkit method and pass arguments
            result = fn.apply(null, arguments || []);
        }

        // Always respond to worker calls with postMessage
        postMessage({
            id,
            method,
            arguments,
            result,
        }, event);
    }, false);
}