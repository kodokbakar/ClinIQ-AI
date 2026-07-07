const swaggerJSDoc = require('swagger-jsdoc')

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ClinIQ-AI API',
      version: '1.0.0',
      description: 'Gamified medical education platform API'
    },
    servers: [{ url: 'http://localhost:8000/api', description: 'Local dev' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./src/modules/**/index.js']
}

module.exports = swaggerJSDoc(options)
