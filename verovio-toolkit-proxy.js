// Use factory pattern to export VerovioToolkitProxy
(function (root, factory) {

    if (typeof module === "object" && typeof module.exports === "object") {
        module.exports = factory();
    } else {
        root.VerovioToolkitProxy = factory();
    }

})(this, function () {

    // Wrapper class to allow to resolve a Promise outside of its scope
    class Deferred {
        constructor() {
            this.promise = new Promise((resolve, reject) => {
                this.reject = reject
                this.resolve = resolve
            });
        }
    }

    // HashMap to store all method calls on the verovio toolkit worker
    const workerTasks = {};

    // Helper function to create a UUID
    const uuidv4 = function () {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    // Helper function to identify method calls in worker onMessage listener
    const createTaksId = function () {
        let id;
        do {
            id = uuidv4();
        } while (workerTasks[id]);
        return id;
    };


    class VerovioToolkitProxy {
        constructor() {

            this.worker = new Worker('verovio-worker.js');
            // Listen to response of the service worker
            this.worker.addEventListener('message', function (event) {
                const { id, result } = event.data
                // Check if there is a Deferred instance in workerTasks HashMap with
                // passed id of the Worker
                const deferred = workerTasks[id];
                if(deferred) {
                    // If so resolve deferred promise and pass verovio toolkit return value
                    deferred.resolve(result);
                }
            }, false);

            // Retrun a Proxy so it is possible to catch all property and method calls
            // of a VerovioToolkitProxy instance
            return new Proxy(this, {
                get: (target, method) => {
                    return function () {
                        const args = Array.prototype.slice.call(arguments);
                        const id = createTaksId();

                        // Post a message to service worker with UUID, method name of the
                        // verovio toolkit function and passed arguments
                        target.worker.postMessage({
                            id,
                            method,
                            arguments: args,
                        });

                        // Create a new Deferred instance and store it in workerTasks HashMap
                        const deferred = new Deferred();
                        workerTasks[id] = deferred;
                        
                        // Return the (currently still unresolved) Promise of the Deferred instance
                        return deferred.promise;
                    };
                },
            });
        }
    }

    // Pass VerovioToolkitProxy to factory
    return VerovioToolkitProxy;
});