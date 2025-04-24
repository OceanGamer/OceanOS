let currentInput = '0';
        let previousInput = '';
        let operation = null;
        let resetInput = false;

        const display = document.getElementById('display');

        function updateDisplay() {
            display.textContent = currentInput;
            
            // Ajustar tamaño de fuente si el número es muy largo
            if (currentInput.length > 9) {
                display.style.fontSize = '3rem';
            } else if (currentInput.length > 6) {
                display.style.fontSize = '3.5rem';
            } else {
                display.style.fontSize = '4rem';
            }
        }

        function appendNumber(number) {
            if (currentInput === '0' || resetInput) {
                currentInput = number.toString();
                resetInput = false;
            } else if (currentInput.length < 12) { // Limitar longitud
                currentInput += number.toString();
            }
            updateDisplay();
        }

        function appendDecimal() {
            if (resetInput) {
                currentInput = '0.';
                resetInput = false;
                updateDisplay();
                return;
            }
            
            if (!currentInput.includes('.')) {
                currentInput += '.';
                updateDisplay();
            }
        }

        function clearAll() {
            currentInput = '0';
            previousInput = '';
            operation = null;
            updateDisplay();
        }

        function toggleSign() {
            currentInput = (parseFloat(currentInput) * -1).toString();
            updateDisplay();
        }

        function percentage() {
            currentInput = (parseFloat(currentInput) / 100).toString();
            updateDisplay();
        }

        function setOperation(op) {
            if (operation !== null) calculate();
            previousInput = currentInput;
            operation = op;
            resetInput = true;
            
            // Resaltar el operador seleccionado
            document.querySelectorAll('.calculator-button-operator').forEach(btn => {
                btn.classList.remove('active');
            });
            event.target.classList.add('active');
        }

        function calculate() {
            let computation;
            const prev = parseFloat(previousInput);
            const current = parseFloat(currentInput);
            
            if (isNaN(prev) || isNaN(current)) return;
            
            switch (operation) {
                case '+':
                    computation = prev + current;
                    break;
                case '-':
                    computation = prev - current;
                    break;
                case '*':
                    computation = prev * current;
                    break;
                case '/':
                    computation = prev / current;
                    break;
                default:
                    return;
            }
            
            // Redondear para evitar decimales largos
            computation = Math.round(computation * 100000000) / 100000000;
            
            currentInput = computation.toString();
            operation = null;
            resetInput = true;
            
            // Quitar resaltado de operadores
            document.querySelectorAll('.calculator-button-operator').forEach(btn => {
                btn.classList.remove('active');
            });
            
            updateDisplay();
        }

        // Función para manejar comandos del menú contextual
        function handleCalculatorCommand(command) {
            switch(command) {
                case 'copy':
                    window.systemAPI.copyText(currentInput);
                    break;
                case 'paste':
                    const pastedText = window.systemAPI.pasteText();
                    if (pastedText && !isNaN(pastedText)) {
                        currentInput = pastedText;
                        updateDisplay();
                    }
                    break;
                case 'add':
                    setOperation('+');
                    break;
                case 'subtract':
                    setOperation('-');
                    break;
                case 'multiply':
                    setOperation('*');
                    break;
                case 'divide':
                    setOperation('/');
                    break;
                case 'calculate':
                    calculate();
                    break;
                case 'percentage':
                    percentage();
                    break;
                case 'toggleSign':
                    toggleSign();
                    break;
                case 'clear':
                    clearAll();
                    break;
            }
        }

        // Escuchar mensajes del sistema
        window.addEventListener('message', (event) => {
            if (event.data.type === 'calculator-command') {
                handleCalculatorCommand(event.data.command);
            }
        });

        // Manejar eventos de teclado
        document.addEventListener('keydown', (e) => {
            if (e.key >= '0' && e.key <= '9') appendNumber(parseInt(e.key));
            else if (e.key === '.') appendDecimal();
            else if (e.key === '+') setOperation('+');
            else if (e.key === '-') setOperation('-');
            else if (e.key === '*') setOperation('*');
            else if (e.key === '/') setOperation('/');
            else if (e.key === 'Enter' || e.key === '=') calculate();
            else if (e.key === 'Escape') clearAll();
            else if (e.key === '%') percentage();
            else if (e.key === '_') toggleSign();
        });

        // Inicializar
        updateDisplay();