class SystemInfo {
    constructor() {
      this.ready = false
      this.init()
    }
  
    async init() {
      // Espera a que la API esté disponible
      await this.waitForAPI()
      
      // Datos iniciales
      this.data = {
        volume: 50,
        muted: false,
        keyboard: 'ESP'
      }
      
      this.ready = true
      this.update()
    }
  
    waitForAPI(retries = 10, interval = 300) {
      return new Promise((resolve) => {
        const check = () => {
          if (window.pythonAPI) return resolve(true)
          if (retries-- <= 0) return resolve(false)
          setTimeout(check, interval)
        }
        check()
      })
    }
  
    async update() {
      if (!this.ready) return
      
      try {
        const [volume, keyboard] = await Promise.all([
          window.pythonAPI.getVolume(),
        ])
        
        this.data = {
          ...this.data,
          volume: volume.level,
          muted: volume.muted,
        }
      } catch (error) {
        console.error('Error updating:', error)
      }
      
      setTimeout(() => this.update(), 1000)
    }
  
    mapKeyboard(layout) {
      const layouts = {
        'en-US': 'ENG',
        'es-ES': 'ESP',
        'fr-FR': 'FRA'
      }
      return layouts[layout] || 'ESP'
    }
  
    // Métodos de control
    async setVolume(level) {
      await window.pythonAPI.setVolume(level)
      this.update()
    }
  
    async toggleMute() {
      await window.pythonAPI.toggleMute()
      this.update()
    }
  
    async changeKeyboard() {
      await window.pythonAPI.changeKeyboardLayout()
      this.update()
    }
  }
  
  // Inicialización segura
  document.addEventListener('DOMContentLoaded', () => {
    window.system = new SystemInfo()
  })