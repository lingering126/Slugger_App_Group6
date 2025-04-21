// API Configuration
const API_CONFIG = {
  PORT: 5000,
  BASE_URL: `http://localhost:5000`,
  get API_URL() {
    return `${this.BASE_URL}/api`;
  }
};

export default API_CONFIG; 