'use strict'

const DEMO_PASSWORD = 'password123'

const demoUsers = [
    {
        name: 'Super Admin',
        email: 'suadm@gmail.com',
        roleName: 'Superadmin'
    },
    {
        name: 'Admin ClinIQ',
        email: 'admin@gmail.com',
        roleName: 'Admin'
    },
    {
        name: 'User Demo',
        email: 'user@gmail.com',
        roleName: 'User'
    },
    {
        name: 'Alya Putri',
        email: 'alya.putri@example.com',
        roleName: 'User'
    },
    {
        name: 'Bagas Pratama',
        email: 'bagas.pratama@example.com',
        roleName: 'User'
    },
    {
        name: 'Citra Maharani',
        email: 'citra.maharani@example.com',
        roleName: 'User'
    },
    {
        name: 'Dimas Saputra',
        email: 'dimas.saputra@example.com',
        roleName: 'User'
    },
    {
        name: 'Eka Wulandari',
        email: 'eka.wulandari@example.com',
        roleName: 'User'
    },
    {
        name: 'Farhan Akbar',
        email: 'farhan.akbar@example.com',
        roleName: 'User'
    },
    {
        name: 'Gita Lestari',
        email: 'gita.lestari@example.com',
        roleName: 'User'
    },
    {
        name: 'Hadi Nugraha',
        email: 'hadi.nugraha@example.com',
        roleName: 'User'
    },
    {
        name: 'Intan Permata',
        email: 'intan.permata@example.com',
        roleName: 'User'
    },
    {
        name: 'Joko Santoso',
        email: 'joko.santoso@example.com',
        roleName: 'User'
    },
    {
        name: 'Karin Amelia',
        email: 'karin.amelia@example.com',
        roleName: 'User'
    },
    {
        name: 'Lukman Hakim',
        email: 'lukman.hakim@example.com',
        roleName: 'User'
    },
    {
        name: 'Maya Sari',
        email: 'maya.sari@example.com',
        roleName: 'User'
    },
    {
        name: 'Nabila Rahma',
        email: 'nabila.rahma@example.com',
        roleName: 'User'
    },
    {
        name: 'Oka Prasetyo',
        email: 'oka.prasetyo@example.com',
        roleName: 'User'
    },
    {
        name: 'Putri Anindya',
        email: 'putri.anindya@example.com',
        roleName: 'User'
    },
    {
        name: 'Raka Mahendra',
        email: 'raka.mahendra@example.com',
        roleName: 'User'
    },
    {
        name: 'Salsa Nirmala',
        email: 'salsa.nirmala@example.com',
        roleName: 'User'
    },
    {
        name: 'Tegar Ramadhan',
        email: 'tegar.ramadhan@example.com',
        roleName: 'User'
    },
    {
        name: 'Vina Oktavia',
        email: 'vina.oktavia@example.com',
        roleName: 'User'
    },
    {
        name: 'Wahyu Kurniawan',
        email: 'wahyu.kurniawan@example.com',
        roleName: 'User'
    },
    {
        name: 'Yasmine Aulia',
        email: 'yasmine.aulia@example.com',
        roleName: 'User'
    },
    {
        name: 'Zaki Firmansyah',
        email: 'zaki.firmansyah@example.com',
        roleName: 'User'
    }
]

const demoGroups = [
    {
        name: 'Koas Internal',
        description:
            'Kelompok belajar kasus klinis untuk mahasiswa profesi dan koas.',
        inviteCode: 'DEMOKOAS01',
        ownerEmail: 'user@gmail.com',
        memberEmails: [
            'user@gmail.com',
            'citra.maharani@example.com',
            'farhan.akbar@example.com',
            'intan.permata@example.com',
            'lukman.hakim@example.com',
            'oka.prasetyo@example.com',
            'salsa.nirmala@example.com',
            'wahyu.kurniawan@example.com'
        ]
    },
    {
        name: 'Bedah Kasus Malang',
        description:
            'Diskusi diagnosis banding dan penalaran klinis berbasis vignette.',
        inviteCode: 'DEMOKASUS02',
        ownerEmail: 'alya.putri@example.com',
        memberEmails: [
            'alya.putri@example.com',
            'dimas.saputra@example.com',
            'gita.lestari@example.com',
            'joko.santoso@example.com',
            'maya.sari@example.com',
            'putri.anindya@example.com',
            'tegar.ramadhan@example.com',
            'yasmine.aulia@example.com'
        ]
    },
    {
        name: 'Klinik Nusantara',
        description:
            'Ruang latihan rutin untuk membaca clue dan mengevaluasi diagnosis.',
        inviteCode: 'DEMONUSA03',
        ownerEmail: 'bagas.pratama@example.com',
        memberEmails: [
            'bagas.pratama@example.com',
            'eka.wulandari@example.com',
            'hadi.nugraha@example.com',
            'karin.amelia@example.com',
            'nabila.rahma@example.com',
            'raka.mahendra@example.com',
            'vina.oktavia@example.com',
            'zaki.firmansyah@example.com'
        ]
    }
]

const demoUserEmails = demoUsers.map((user) => user.email)

const demoLearnerEmails = demoUsers
    .filter((user) => user.roleName === 'User')
    .map((user) => user.email)

module.exports = {
    DEMO_PASSWORD,
    demoGroups,
    demoLearnerEmails,
    demoUserEmails,
    demoUsers
}