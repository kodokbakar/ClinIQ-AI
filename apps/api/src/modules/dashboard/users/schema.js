const { z } = require('zod')

const UserCreateSchema = z.object({
   name: z.string().min(1, 'Nama tidak boleh kosong'),
   email: z.email('Format email tidak valid'),
   password: z.string().min(6, 'Password minimal 6 karakter'),
   role_id: z.uuid('Format role ID tidak valid')
})

const UserUpdateSchema = z.object({
   name: z.string().min(1, 'Nama tidak boleh kosong').optional(),
   email: z.email('Format email tidak valid').optional()
})

const ResetPasswordSchema = z
   .object({
      password: z
         .string()
         .min(8, 'Password minimal 8 karakter')
         .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
            'Password harus mengandung huruf kecil, huruf besar, dan angka'
         ),
      confirm_password: z.string().min(1, 'Konfirmasi password tidak boleh kosong')
   })
   .refine((data) => data.password === data.confirm_password, {
      message: 'Password dan konfirmasi password tidak cocok',
      path: ['confirm_password']
   })

const UpdateUserAccessSchema = z.object({
   access: z.array(
      z.object({
         menu_id: z.uuid('Format menu ID tidak valid'),
         permissions: z.array(
            z.object({
               action: z.enum(
                  ['read', 'create', 'update', 'delete'],
                  'Action harus salah satu dari: read, create, update, delete'
               ),
               granted: z.boolean('Granted harus berupa boolean')
            })
         )
      })
   )
})

module.exports = {
   UserCreateSchema,
   UserUpdateSchema,
   ResetPasswordSchema,
   UpdateUserAccessSchema
}
