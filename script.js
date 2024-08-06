document.getElementById('fileInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const text = e.target.result;
            processCSV(text);
        };
        reader.readAsText(file);
    }
});

function processCSV(text) {
    const lines = text.split('\n');
    const processes = [];
    let lineCount = 0;
    let headerSkipped = false;
    lines.forEach(line => {
        if (line.trim().length === 0) return;
        const tokens = line.split(',');
        if (tokens.length === 6 && isNaN(tokens[1]) && !headerSkipped) {
            headerSkipped = true;
            return;
        }
        if (tokens.length !== 6) {
            alert(`Error: Incorrect number of values on line ${lineCount + 1}`);
            return;
        }
        const process = {
            PID: tokens[0],
            AT: parseInt(tokens[1]),
            CPU1: parseInt(tokens[2]),
            IO: parseInt(tokens[3]),
            CPU2: parseInt(tokens[4]),
            priority: parseInt(tokens[5]),
            FT: 0,
            TAT: 0,
            WT: 0,
            remainingTime: parseInt(tokens[2]),
            cpu1Completed: false
        };
        processes.push(process);
        lineCount++;
    });
    if (lineCount !== 5) {
        alert('There should be exactly 5 processes');
        return;
    }
    displayInputData(processes);
    simulateCPUScheduling(processes, 4);  // Change 4 to 7 if you want to simulate with a quantum of 7
}

function displayInputData(processes) {
    const tbody = document.querySelector('#inputTable tbody');
    tbody.innerHTML = '';
    processes.forEach(process => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${process.PID}</td><td>${process.AT}</td><td>${process.CPU1}</td><td>${process.IO}</td><td>${process.CPU2}</td><td>${process.priority}</td>`;
        tbody.appendChild(row);
    });
}

function simulateCPUScheduling(processes, quantum) {
    const readyQueue = [];
    const blockQueue = [];
    const finishedProcesses = [];

    let time = 0, idleTime = 0;

    while (processes.length > 0 || readyQueue.length > 0 || blockQueue.length > 0) {
        addToReadyQueue(readyQueue, processes, time);

        if (readyQueue.length > 0) {
            readyQueue.sort(compareByPriorityATandPID);
            let p = readyQueue.shift();

            let executionTime = Math.min(quantum, p.remainingTime);
            p.remainingTime -= executionTime;
            time += executionTime;

            if (p.remainingTime === 0) {
                if (!p.cpu1Completed) {
                    p.cpu1Completed = true;
                    p.remainingTime = p.CPU2;
                    p.IO += time; // Adding the current time to I/O time to simulate the waiting
                    blockQueue.push(p);
                } else {
                    p.FT = time;
                    p.TAT = p.FT - p.AT;
                    p.WT = p.TAT - (p.CPU1 + p.CPU2);
                    finishedProcesses.push(p);
                }
            } else {
                readyQueue.push(p);
            }
        } else {
            time++;
            idleTime++;
        }

        while (blockQueue.length > 0 && blockQueue[0].IO <= time) {
            let p = blockQueue.shift();
            p.IO = 0;
            readyQueue.push(p);
        }
    }

    displayResults(finishedProcesses, time, idleTime);
}

function addToReadyQueue(readyQueue, processes, currentTime) {
    for (let i = 0; i < processes.length; i++) {
        if (processes[i].AT <= currentTime) {
            readyQueue.push(processes[i]);
            processes.splice(i, 1);
            i--; // Adjust index after removal
        }
    }
}

function compareByPriorityATandPID(a, b) {
    if (a.priority === b.priority) {
        if (a.AT === b.AT) {
            return a.PID < b.PID ? -1 : 1;
        }
        return a.AT < b.AT ? -1 : 1;
    }
    return a.priority < b.priority ? -1 : 1;
}

function displayResults(processes, totalCPUTime, idleTime) {
    const tbody = document.querySelector('#resultsTable tbody');
    tbody.innerHTML = '';
    let avgTAT = 0, avgWT = 0;

    processes.sort(compareByPID);

    processes.forEach(process => {
        avgTAT += process.TAT;
        avgWT += process.WT;
        const row = document.createElement('tr');
        row.innerHTML = `<td>${process.PID}</td><td>${process.AT}</td><td>${process.FT}</td><td>${process.TAT}</td><td>${process.WT}</td>`;
        tbody.appendChild(row);
    });

    avgTAT /= processes.length;
    avgWT /= processes.length;
    const cpuUtilization = ((totalCPUTime - idleTime) / totalCPUTime) * 100;

    document.getElementById('avgWT').innerText = avgWT.toFixed(2);
    document.getElementById('avgTAT').innerText = avgTAT.toFixed(2);
    document.getElementById('cpuUtilization').innerText = cpuUtilization.toFixed(2) + '%';
}

function compareByPID(a, b) {
    return a.PID < b.PID ? -1 : 1;
}
