class LockScreen {
    constructor() {
        this.passwordInput = document.getElementById('os_lockscreen_password');
        this.errorMessage = document.getElementById('os_lockscreen_error');
        this.timeElement = document.getElementById('lockScreenTime');
        this.dateElement = document.getElementById('lockScreenDate');
        this.userData = null;
        this.loadUserData();
        this.setupEventListeners();
        this.updateDateTime();
        setInterval(() => this.updateDateTime(), 1000);
    }

    updateDateTime() {
        const now = new Date();
        
        // Formatear hora
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        
        // Formatear fecha
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        
        const dayName = days[now.getDay()];
        const day = now.getDate();
        const month = months[now.getMonth()];
        
        // Actualizar elementos
        this.timeElement.textContent = `${hours}:${minutes}`;
        this.dateElement.textContent = `${dayName}, ${day} de ${month}`;
    }

    async loadUserData() {
        try {
            const response = await fetch('Data/OS/user.json');
            this.userData = await response.json();
        } catch (error) {
            console.error('Error al cargar datos del usuario:', error);
        }
    }

    setupEventListeners() {
        if (this.passwordInput) {
            this.passwordInput.addEventListener('keydown', this.handleKeyDown.bind(this));
        }
    }

    handleKeyDown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            this.verifyPassword();
        }
    }

    removeEventListeners() {
        if (this.passwordInput) {
            this.passwordInput.removeEventListener('keydown', this.handleKeyDown.bind(this));
        }
    }

    async verifyPassword() {
        if (!this.userData) {
            await this.loadUserData();
        }

        const enteredPassword = this.passwordInput.value;
        
        if (enteredPassword === this.userData.password) {
            // Desactivar el input y el event listener
            this.passwordInput.disabled = true;
            this.removeEventListeners();
            
            // Mostrar mensaje de carga
            if (this.errorMessage) {
                this.errorMessage.textContent = 'Cargando...';
                this.errorMessage.classList.remove('error');
            }
            
            // Cargar el escritorio
            if (typeof window.os_loadDesktop === 'function') {
                window.os_loadDesktop();
            }
        } else {
            this.showErrorAnimation();
        }
    }

    showErrorAnimation() {
        // Resetear el input
        this.passwordInput.value = '';
        
        // Mostrar mensaje de error
        if (this.errorMessage) {
            this.errorMessage.textContent = 'Contraseña incorrecta';
            this.errorMessage.classList.add('error');
            
            // Animación de shake
            this.passwordInput.classList.add('shake');
            
            // Remover las clases después de la animación
            setTimeout(() => {
                this.passwordInput.classList.remove('shake');
                this.errorMessage.classList.remove('error');
                this.errorMessage.textContent = 'Pulsa Intro para continuar';
            }, 2000);
        }
    }
}

window.lockScreen = new LockScreen();
