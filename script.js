class Calculator {
    constructor(mainDisplay, historyDisplay) {
        this.mainDisplay = mainDisplay;
        this.historyDisplay = historyDisplay;
        this.expression = '';
        this.isResultShown = false;
        this.variables = { A: 0, B: 0, C: 0 };
        this.history = [];
        this.unit = 'D'; // Degree mode
        this.lastDecimalResult = undefined;
        this.lastFractionResult = undefined;
        this.isShift = false;
    }

    append(value) {
        if (this.isShift && ['A', 'B', 'C'].includes(value)) {
            let valToStore = this.lastDecimalResult !== undefined ? this.lastDecimalResult : 0;
            this.variables[value] = valToStore;
            this.historyDisplay.textContent = `Stored in ${value}`;
            this.expression = valToStore.toString();
            this.isResultShown = true;
            this.isShift = false;
            document.querySelector('[data-func="shift"]').classList.remove('active');
            this.updateDisplay();
            return;
        }

        if (this.isShift) {
            this.isShift = false;
            document.querySelector('[data-func="shift"]').classList.remove('active');
        }

        if (this.isResultShown) {
            if (!isNaN(value) || value === '.' || value === '(' || value === 'pi' || value === 'e' || ['A', 'B', 'C'].includes(value) || value.includes('sin') || value.includes('cos') || value.includes('tan') || value.includes('log') || value.includes('ln') || value.includes('sqrt')) {
                this.expression = '';
            }
            this.isResultShown = false;
        }

        if (value === '.') {
            const parts = this.expression.split(/[\+\-\*\/\(\)]/);
            const lastPart = parts[parts.length - 1];
            if (lastPart.includes('.')) return;
        }

        this.expression += value;
        this.updateDisplay();
    }

    delete() {
        if (this.isResultShown) { this.clear(); return; }
        this.expression = this.expression.slice(0, -1);
        this.updateDisplay();
    }

    clear() {
        this.expression = '';
        this.isResultShown = false;
        this.updateDisplay();
        this.historyDisplay.textContent = '';
    }

    updateDisplay() {
        this.mainDisplay.textContent = this.expression || '0';
        this.mainDisplay.scrollLeft = this.mainDisplay.scrollWidth;
    }

    getFraction(decimal) {
        if (Math.abs(decimal - Math.round(decimal)) < 1.0e-9) return decimal.toString();
        let precision = 1.0e-9;
        let x = decimal;
        let a = Math.floor(x);
        let h1 = 1, h2 = a, k1 = 0, k2 = 1;
        while (Math.abs(x - a) > precision * h2 * k2) {
            x = 1 / (x - a);
            a = Math.floor(x);
            let h = a * h2 + h1, k = a * k2 + k1;
            h1 = h2; h2 = h; k1 = k2; k2 = k;
            if (k2 > 1000) break;
        }
        return `(${h2}/${k2})`;
    }

    getExactTrig(func, angle) {
        if (this.unit !== 'D') return null;
        const a = ((angle % 360) + 360) % 360;
        const map = {
            'sin': { 0: '0', 30: '(1/2)', 45: '(√2/2)', 60: '(√3/2)', 90: '1', 180: '0', 270: '-1' },
            'cos': { 0: '1', 30: '(√3/2)', 45: '(√2/2)', 60: '(1/2)', 90: '0', 180: '-1', 270: '0' },
            'tan': { 0: '0', 30: '(√3/3)', 45: '1', 60: '√3', 90: 'Undefined', 180: '0' }
        };
        return map[func] ? map[func][a] : null;
    }

    calculate() {
        if (!this.expression) return;
        
        // Auto-close missing parentheses
        const openParens = (this.expression.match(/\(/g) || []).length;
        const closeParens = (this.expression.match(/\)/g) || []).length;
        if (openParens > closeParens) {
            this.expression += ')'.repeat(openParens - closeParens);
        }
        
        const trigMatch = this.expression.match(/^(sin|cos|tan)\((\d+)\)$/);
        if (trigMatch && this.unit === 'D') {
            if (trigMatch[1] === 'tan' && parseInt(trigMatch[2]) % 180 === 90) {
                this.mainDisplay.textContent = 'Math Error';
                this.isResultShown = true;
                this.expression = '';
                return;
            }
            const exact = this.getExactTrig(trigMatch[1], parseInt(trigMatch[2]));
            if (exact && exact !== 'Undefined') {
                let angle = parseInt(trigMatch[2]) * Math.PI / 180;
                this.lastDecimalResult = Math[trigMatch[1]](angle);
                this.lastFractionResult = exact;
                this.historyDisplay.textContent = this.expression + ' =';
                this.expression = exact;
                this.isResultShown = true;
                this.updateDisplay();
                this.saveToHistory(this.historyDisplay.textContent + ' ' + exact);
                return;
            }
        }

        try {
            const sin = (x) => this.unit === 'D' ? Math.sin(x * Math.PI / 180) : Math.sin(x);
            const cos = (x) => this.unit === 'D' ? Math.cos(x * Math.PI / 180) : Math.cos(x);
            const tan = (x) => {
                if (this.unit === 'D' && x % 180 === 90) return Infinity;
                return this.unit === 'D' ? Math.tan(x * Math.PI / 180) : Math.tan(x);
            };
            const asin = (x) => this.unit === 'D' ? Math.asin(x) * 180 / Math.PI : Math.asin(x);
            const acos = (x) => this.unit === 'D' ? Math.acos(x) * 180 / Math.PI : Math.acos(x);
            const atan = (x) => this.unit === 'D' ? Math.atan(x) * 180 / Math.PI : Math.atan(x);
            const log = Math.log10;
            const ln = Math.log;
            const sqrt = Math.sqrt;
            const pi = Math.PI;
            const e = Math.E;

            let expr = this.expression
                .replace(/π/g, 'pi')
                .replace(/A/g, `(${this.variables.A})`)
                .replace(/B/g, `(${this.variables.B})`)
                .replace(/C/g, `(${this.variables.C})`)
                .replace(/√(\d+(\.\d+)?)/g, 'sqrt($1)')
                .replace(/\^/g, '**');

            expr = expr.replace(/(\d)\(/g, '$1*(').replace(/\)(\d)/g, ')*$1');
            expr = expr.replace(/(\d)(pi|e|sin|cos|tan|asin|acos|atan|log|ln|sqrt)/g, '$1*$2');
            expr = expr.replace(/\)\(/g, ')*(');

            const result = eval(expr);

            if (!isFinite(result) || isNaN(result)) {
                throw new Error("Math Error");
            }

            let roundedResult = Math.round(result * 1e10) / 1e10;
            this.lastDecimalResult = roundedResult;
            
            let finalOutput;
            if (Number.isInteger(roundedResult)) {
                finalOutput = roundedResult.toString();
            } else {
                finalOutput = this.getFraction(roundedResult);
                if (finalOutput.includes('/100') || finalOutput.length > 12) {
                    finalOutput = parseFloat(roundedResult.toFixed(8)).toString();
                }
            }
            
            this.lastFractionResult = finalOutput;
            this.historyDisplay.textContent = this.expression + ' =';
            this.saveToHistory(this.expression + ' = ' + finalOutput);
            this.expression = finalOutput;
            this.isResultShown = true;
            this.updateDisplay();
        } catch (error) {
            this.mainDisplay.textContent = error.message === "Math Error" ? "Math Error" : "Syntax Error";
            this.isResultShown = true;
            this.expression = '';
        }
    }

    toggleResultFormat() {
        if (!this.isResultShown || this.lastDecimalResult === undefined) return;
        if (this.expression === this.lastFractionResult && this.lastFractionResult !== this.lastDecimalResult.toString()) {
            this.expression = parseFloat(this.lastDecimalResult.toFixed(10)).toString();
        } else {
            this.expression = this.lastFractionResult;
        }
        this.updateDisplay();
    }

    saveToHistory(entry) {
        this.history.push(entry);
        if (this.history.length > 50) this.history.shift();
        localStorage.setItem('calc_history', JSON.stringify(this.history));
    }

    loadHistory() {
        const saved = localStorage.getItem('calc_history');
        if (saved) { this.history = JSON.parse(saved); }
    }
}

let audioCtx;
function playClickSound() {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.05);
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.05);
    } catch (e) {
        console.log("Audio not supported or disabled");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const mainDisplay = document.getElementById('main-display');
    const historyDisplay = document.getElementById('history-display');
    const calculator = new Calculator(mainDisplay, historyDisplay);
    calculator.loadHistory();

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            playClickSound();
        });
    });

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('expr')) {
        calculator.expression = urlParams.get('expr');
        calculator.updateDisplay();
    }

    document.querySelector('.keypad').addEventListener('click', (e) => {
        const btn = e.target.closest('.btn');
        if (!btn) return;
        playClickSound();
        const val = btn.dataset.val;
        const func = btn.dataset.func;
        if (val) calculator.append(val);
        else if (func) {
            switch (func) {
                case 'clear': calculator.clear(); break;
                case 'delete': calculator.delete(); break;
                case 'equal': calculator.calculate(); break;
                case 'mode': 
                    if (calculator.isResultShown) {
                        calculator.toggleResultFormat();
                    } else {
                        calculator.unit = calculator.unit === 'D' ? 'R' : 'D';
                        document.getElementById('unit-indicator').textContent = calculator.unit;
                    }
                    break;
                case 'shift': 
                    calculator.isShift = !calculator.isShift;
                    btn.classList.toggle('active'); 
                    break;
                case 'alpha':
                    break;
            }
        }
    });



    document.addEventListener('keydown', (e) => {
        const key = e.key;
        if (/[0-9]/.test(key) || ['+', '-', '*', '/', '.', '(', ')', 'Enter', 'Backspace', 'Escape', '='].includes(key)) playClickSound();
        if (/[0-9]/.test(key)) calculator.append(key);
        if (['+', '-', '*', '/'].includes(key)) calculator.append(key);
        if (key === '.') calculator.append('.');
        if (key === '(' || key === ')') calculator.append(key);
        if (key === 'Enter' || key === '=') { e.preventDefault(); calculator.calculate(); }
        if (key === 'Backspace') calculator.delete();
        if (key === 'Escape') calculator.clear();
    });

    setTimeout(() => {
        mainDisplay.textContent = 'CASIO';
        setTimeout(() => calculator.updateDisplay(), 800);
    }, 100);
});
