const { ZodError } = require('zod')
const { HttpStatusCode } = require('axios')

const validateRequest = (schema, req) => {
   return schema.parse(req.body)
}

const validationFiles = (files, validationRules) => {
   if (!files || Object.keys(files).length === 0) {
      return true
   }

   for (const rule of validationRules) {
      const { name, allowed_mimes, max_size } = rule

      if (files[name]) {
         const fileArray = Array.isArray(files[name]) ? files[name] : [files[name]]

         for (const file of fileArray) {
            if (allowed_mimes && allowed_mimes.length > 0) {
               const fileMime = file.mimetype.split('/')[1]
               const isValidMime = allowed_mimes.some((mime) => {
                  if (mime.includes('/')) {
                     return file.mimetype === mime
                  } else {
                     return (
                        fileMime === mime || (mime === 'jpg' && fileMime === 'jpeg')
                     )
                  }
               })

               if (!isValidMime) {
                  throw {
                     code: HttpStatusCode.BadRequest,
                     message: `Format file ${name} harus ${allowed_mimes.join(', ')}`
                  }
               }
            }

            if (max_size && file.size > max_size) {
               const maxSizeMB = (max_size / (1024 * 1024)).toFixed(1)
               throw {
                  code: HttpStatusCode.BadRequest,
                  message: `Ukuran file ${name} maksimal ${maxSizeMB}MB`
               }
            }
         }
      }
   }

   return true
}

module.exports = {
   validateRequest,
   validationFiles
}
