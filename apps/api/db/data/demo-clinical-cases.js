'use strict'

const clinicalCases = [
   {
      icdCode: '1D2Z',
      name: 'Dengue',
      description:
         'Infeksi virus dengue yang ditularkan melalui gigitan nyamuk Aedes dan dapat menimbulkan demam akut, trombositopenia, serta kebocoran plasma.',
      variantName: 'Kasus dengue pada dewasa muda',
      clues: [
         {
            type: 'demographic',
            content:
               'Seorang perempuan berusia 24 tahun datang setelah mengalami demam selama empat hari.'
         },
         {
            type: 'history',
            content:
               'Demam muncul mendadak dan disertai nyeri kepala, nyeri di belakang mata, serta pegal pada seluruh tubuh.'
         },
         {
            type: 'symptom',
            content:
               'Pasien mengeluhkan mual, berkurangnya nafsu makan, ruam kemerahan, dan perdarahan ringan pada gusi.'
         },
         {
            type: 'physical_exam',
            content:
               'Suhu tubuh 39°C, ditemukan petekie pada tungkai, dan uji torniket memberikan hasil positif.'
         },
         {
            type: 'diagnostic',
            content:
               'Pemeriksaan laboratorium menunjukkan leukopenia, trombosit 78.000/µL, peningkatan hematokrit, dan antigen NS1 positif.'
         }
      ]
   },
   {
      icdCode: '1F40',
      name: 'Malaria falciparum',
      description:
         'Infeksi parasit Plasmodium falciparum yang ditularkan melalui gigitan nyamuk Anopheles dan dapat berkembang menjadi malaria berat.',
      variantName: 'Kasus malaria setelah perjalanan',
      clues: [
         {
            type: 'demographic',
            content:
               'Seorang laki-laki berusia 31 tahun datang sepuluh hari setelah pulang dari daerah endemis malaria di Papua.'
         },
         {
            type: 'history',
            content:
               'Pasien mengalami demam berulang yang diawali menggigil hebat dan diikuti keringat berlebihan.'
         },
         {
            type: 'symptom',
            content:
               'Keluhan lain berupa nyeri kepala, pegal, mual, dan tubuh terasa sangat lemah.'
         },
         {
            type: 'physical_exam',
            content:
               'Pemeriksaan menunjukkan konjungtiva pucat, suhu 39,2°C, dan pembesaran limpa ringan.'
         },
         {
            type: 'diagnostic',
            content:
               'Sediaan darah tebal dan tipis memperlihatkan parasit Plasmodium falciparum, disertai anemia dan trombositopenia.'
         }
      ]
   },
   {
      icdCode: '5A11',
      name: 'Diabetes melitus tipe 2',
      description:
         'Gangguan metabolik kronis yang ditandai oleh hiperglikemia akibat resistensi insulin dan kekurangan insulin relatif.',
      variantName: 'Kasus hiperglikemia pada dewasa',
      clues: [
         {
            type: 'demographic',
            content:
               'Seorang laki-laki berusia 52 tahun dengan indeks massa tubuh 31 kg/m² datang untuk pemeriksaan.'
         },
         {
            type: 'history',
            content:
               'Selama tiga bulan terakhir pasien lebih sering buang air kecil dan terus merasa haus.'
         },
         {
            type: 'symptom',
            content:
               'Pasien mudah lelah, mengalami penurunan berat badan, dan memiliki riwayat diabetes dalam keluarga.'
         },
         {
            type: 'physical_exam',
            content:
               'Ditemukan akantosis nigrikans pada leher dan tanda dehidrasi ringan tanpa gangguan kesadaran.'
         },
         {
            type: 'diagnostic',
            content:
               'Glukosa darah puasa 186 mg/dL, glukosa darah sewaktu 268 mg/dL, dan HbA1c 8,4%.'
         }
      ]
   },
   {
      icdCode: 'BA00.Z',
      name: 'Hipertensi esensial',
      description:
         'Peningkatan tekanan darah menetap yang tidak disebabkan oleh penyakit sekunder yang dapat diidentifikasi.',
      variantName: 'Kasus tekanan darah tinggi berulang',
      clues: [
         {
            type: 'demographic',
            content:
               'Seorang perempuan berusia 49 tahun datang setelah beberapa kali memperoleh hasil tekanan darah tinggi.'
         },
         {
            type: 'history',
            content:
               'Pasien sering tidak bergejala, tetapi sesekali merasakan sakit kepala pada bagian belakang kepala.'
         },
         {
            type: 'risk_factor',
            content:
               'Pasien memiliki riwayat keluarga dengan tekanan darah tinggi, jarang berolahraga, dan sering mengonsumsi makanan tinggi garam.'
         },
         {
            type: 'physical_exam',
            content:
               'Tekanan darah pada kedua lengan adalah 168/104 mmHg dan tetap tinggi setelah pengukuran ulang dalam keadaan istirahat.'
         },
         {
            type: 'diagnostic',
            content:
               'Fungsi ginjal, elektrolit, dan urinalisis dalam batas normal serta tidak ditemukan tanda penyebab hipertensi sekunder.'
         }
      ]
   },
   {
      icdCode: 'CA40.Z',
      name: 'Pneumonia',
      description:
         'Infeksi jaringan paru yang menyebabkan peradangan alveoli dan dapat menimbulkan demam, batuk, sesak napas, serta infiltrat paru.',
      variantName: 'Kasus infeksi saluran napas bawah',
      clues: [
         {
            type: 'demographic',
            content:
               'Seorang laki-laki berusia 67 tahun datang dengan riwayat merokok selama lebih dari 30 tahun.'
         },
         {
            type: 'history',
            content:
               'Pasien mengalami demam dan batuk berdahak kekuningan sejak tiga hari terakhir.'
         },
         {
            type: 'symptom',
            content:
               'Keluhan disertai sesak napas dan nyeri dada kanan yang bertambah ketika menarik napas dalam.'
         },
         {
            type: 'physical_exam',
            content:
               'Frekuensi napas 28 kali per menit, saturasi oksigen 91%, dan terdengar ronki basah pada lapang paru kanan bawah.'
         },
         {
            type: 'diagnostic',
            content:
               'Darah menunjukkan leukositosis neutrofilik dan foto toraks memperlihatkan konsolidasi pada lobus bawah paru kanan.'
         }
      ]
   },
   {
      icdCode: '1A07',
      name: 'Demam tifoid',
      description:
         'Infeksi sistemik akibat Salmonella Typhi yang umumnya ditularkan melalui makanan atau air yang terkontaminasi.',
      variantName: 'Kasus demam berkepanjangan pada remaja',
      clues: [
         {
            type: 'demographic',
            content:
               'Seorang laki-laki berusia 19 tahun datang dengan demam yang berlangsung selama delapan hari.'
         },
         {
            type: 'history',
            content:
               'Demam meningkat secara bertahap, terutama pada sore dan malam hari, setelah pasien sering membeli makanan dari lingkungan dengan sanitasi kurang baik.'
         },
         {
            type: 'symptom',
            content:
               'Pasien mengeluhkan sakit kepala, lemah, nafsu makan menurun, nyeri perut, dan sulit buang air besar.'
         },
         {
            type: 'physical_exam',
            content:
               'Suhu tubuh 39°C, lidah tampak berlapis putih dengan tepi kemerahan, dan ditemukan bercak kemerahan samar pada abdomen.'
         },
         {
            type: 'diagnostic',
            content:
               'Pemeriksaan darah menunjukkan leukopenia ringan dan kultur darah menumbuhkan Salmonella Typhi.'
         }
      ]
   },
   {
      icdCode: '1B10.0',
      name: 'Tuberkulosis paru terkonfirmasi',
      description:
         'Infeksi paru akibat Mycobacterium tuberculosis yang telah dikonfirmasi melalui pemeriksaan bakteriologis atau histologis.',
      variantName: 'Kasus batuk kronis dengan penurunan berat badan',
      clues: [
         {
            type: 'demographic',
            content:
               'Seorang laki-laki berusia 32 tahun datang dengan batuk yang tidak membaik selama lebih dari satu bulan.'
         },
         {
            type: 'history',
            content:
               'Pasien tinggal serumah dengan anggota keluarga yang pernah menjalani pengobatan infeksi paru menular.'
         },
         {
            type: 'symptom',
            content:
               'Keluhan disertai keringat malam, demam ringan, penurunan berat badan, berkurangnya nafsu makan, dan sesekali batuk darah.'
         },
         {
            type: 'physical_exam',
            content:
               'Pasien tampak kurus dan terdengar suara napas bronkial serta ronki pada lapang paru bagian atas.'
         },
         {
            type: 'diagnostic',
            content:
               'Foto toraks menunjukkan kavitas pada lobus atas dan pemeriksaan molekuler sputum mendeteksi Mycobacterium tuberculosis.'
         }
      ]
   },
   {
      icdCode: 'CA23',
      name: 'Asma',
      description:
         'Penyakit inflamasi kronis saluran napas dengan gejala dan hambatan aliran udara yang berubah-ubah.',
      variantName: 'Kasus mengi berulang pada dewasa muda',
      clues: [
         {
            type: 'demographic',
            content:
               'Seorang perempuan berusia 21 tahun datang karena beberapa kali mengalami sesak napas sejak masa sekolah.'
         },
         {
            type: 'history',
            content:
               'Keluhan sering muncul setelah terpapar debu, udara dingin, bulu hewan, atau setelah berolahraga.'
         },
         {
            type: 'symptom',
            content:
               'Pasien mengalami batuk pada malam hari, rasa berat di dada, dan bunyi mengi yang hilang timbul.'
         },
         {
            type: 'physical_exam',
            content:
               'Saat serangan terdengar mengi ekspirasi bilateral, sedangkan pemeriksaan di antara serangan dapat kembali normal.'
         },
         {
            type: 'diagnostic',
            content:
               'Spirometri menunjukkan hambatan aliran udara yang membaik secara bermakna setelah pemberian bronkodilator.'
         }
      ]
   },
   {
      icdCode: 'CA22',
      name: 'Penyakit paru obstruktif kronis',
      description:
         'Penyakit paru kronis dengan keterbatasan aliran udara persisten yang biasanya berkaitan dengan pajanan partikel atau gas berbahaya.',
      variantName: 'Kasus sesak progresif pada perokok',
      clues: [
         {
            type: 'demographic',
            content:
               'Seorang laki-laki berusia 64 tahun datang dengan sesak napas yang semakin mengganggu aktivitas sehari-hari.'
         },
         {
            type: 'risk_factor',
            content:
               'Pasien merokok sekitar dua bungkus per hari selama lebih dari 35 tahun dan masih aktif merokok.'
         },
         {
            type: 'history',
            content:
               'Batuk berdahak telah terjadi hampir setiap hari selama beberapa tahun dan disertai sesak progresif ketika berjalan.'
         },
         {
            type: 'physical_exam',
            content:
               'Ditemukan ekspirasi memanjang, suara napas melemah, penggunaan otot bantu napas, dan bentuk dada menyerupai tong.'
         },
         {
            type: 'diagnostic',
            content:
               'Spirometri setelah bronkodilator menunjukkan rasio FEV1 terhadap FVC kurang dari 0,70 dan hambatan tidak sepenuhnya reversibel.'
         }
      ]
   },
   {
      icdCode: 'DA22.Z',
      name: 'Penyakit refluks gastroesofageal',
      description:
         'Kondisi ketika refluks isi lambung menimbulkan gejala yang mengganggu atau komplikasi pada saluran cerna bagian atas.',
      variantName: 'Kasus rasa terbakar setelah makan',
      clues: [
         {
            type: 'demographic',
            content:
               'Seorang laki-laki berusia 38 tahun dengan berat badan berlebih datang karena rasa tidak nyaman pada dada bagian tengah.'
         },
         {
            type: 'history',
            content:
               'Keluhan biasanya muncul setelah makan dalam porsi besar, minum kopi, atau berbaring segera setelah makan.'
         },
         {
            type: 'symptom',
            content:
               'Pasien merasakan sensasi terbakar dari ulu hati menuju dada dan cairan asam kadang kembali ke mulut.'
         },
         {
            type: 'physical_exam',
            content:
               'Pemeriksaan jantung dan paru dalam batas normal serta tidak ditemukan nyeri tekan abdomen yang bermakna.'
         },
         {
            type: 'diagnostic',
            content:
               'Pemantauan pH esofagus menunjukkan peningkatan paparan asam yang berkaitan dengan munculnya keluhan pasien.'
         }
      ]
   },
   {
      icdCode: 'DB10.02',
      name: 'Apendisitis akut tanpa peritonitis',
      description:
         'Peradangan akut pada apendiks tanpa tanda peritonitis lokal maupun menyeluruh.',
      variantName: 'Kasus nyeri perut kanan bawah',
      clues: [
         {
            type: 'demographic',
            content:
               'Seorang perempuan berusia 22 tahun datang dengan nyeri perut yang semakin berat selama 18 jam.'
         },
         {
            type: 'history',
            content:
               'Nyeri awalnya dirasakan di sekitar pusar kemudian berpindah dan menetap pada perut kanan bawah.'
         },
         {
            type: 'symptom',
            content:
               'Keluhan disertai mual, tidak nafsu makan, dan demam ringan tanpa riwayat diare.'
         },
         {
            type: 'physical_exam',
            content:
               'Ditemukan nyeri tekan pada titik McBurney, nyeri lepas ringan, dan nyeri bertambah ketika pasien batuk.'
         },
         {
            type: 'diagnostic',
            content:
               'Darah menunjukkan leukositosis neutrofilik dan ultrasonografi memperlihatkan apendiks membesar, tidak dapat dikompresi, tanpa abses atau cairan bebas.'
         }
      ]
   },
   {
      icdCode: '3A00',
      name: 'Anemia defisiensi besi',
      description:
         'Anemia yang disebabkan oleh berkurangnya cadangan besi sehingga produksi hemoglobin menjadi tidak memadai.',
      variantName: 'Kasus kelelahan pada perempuan usia produktif',
      clues: [
         {
            type: 'demographic',
            content:
               'Seorang perempuan berusia 29 tahun datang karena mudah lelah dan sulit berkonsentrasi selama beberapa bulan.'
         },
         {
            type: 'history',
            content:
               'Pasien mengalami menstruasi yang banyak dan berlangsung tujuh hingga sembilan hari setiap bulan.'
         },
         {
            type: 'symptom',
            content:
               'Pasien sering pusing ketika berdiri, berdebar saat beraktivitas, dan memiliki kebiasaan mengunyah es batu.'
         },
         {
            type: 'physical_exam',
            content:
               'Konjungtiva tampak pucat, kuku tipis berbentuk cekung, dan sudut bibir terlihat pecah-pecah.'
         },
         {
            type: 'diagnostic',
            content:
               'Hemoglobin rendah dengan eritrosit mikrositik hipokromik, ferritin serum rendah, dan saturasi transferin menurun.'
         }
      ]
   },
   {
      icdCode: '8A80.0',
      name: 'Migrain tanpa aura',
      description:
         'Gangguan sakit kepala berulang dengan serangan nyeri khas tanpa didahului gejala neurologis aura.',
      variantName: 'Kasus sakit kepala berdenyut berulang',
      clues: [
         {
            type: 'demographic',
            content:
               'Seorang perempuan berusia 27 tahun datang karena sakit kepala berulang sejak dua tahun terakhir.'
         },
         {
            type: 'history',
            content:
               'Setiap serangan berlangsung antara delapan hingga dua puluh empat jam dan sering dipicu kurang tidur atau terlambat makan.'
         },
         {
            type: 'symptom',
            content:
               'Nyeri terasa berdenyut pada satu sisi kepala, memburuk ketika beraktivitas, dan disertai mual serta sensitif terhadap cahaya dan suara.'
         },
         {
            type: 'physical_exam',
            content:
               'Pemeriksaan neurologis di antara serangan normal dan pasien tidak pernah mengalami gangguan penglihatan atau sensorik sebelum nyeri.'
         },
         {
            type: 'diagnostic',
            content:
               'Tidak ditemukan demam, kaku kuduk, defisit neurologis, trauma, atau tanda bahaya lain yang menunjukkan penyebab sakit kepala sekunder.'
         }
      ]
   },
   {
      icdCode: '5A02.0',
      name: 'Tirotoksikosis dengan gondok difus',
      description:
         'Keadaan kelebihan hormon tiroid yang disertai pembesaran kelenjar tiroid secara difus, sering berkaitan dengan penyakit Graves.',
      variantName: 'Kasus penurunan berat badan dengan berdebar',
      clues: [
         {
            type: 'demographic',
            content:
               'Seorang perempuan berusia 34 tahun datang karena berat badannya menurun meskipun nafsu makan meningkat.'
         },
         {
            type: 'history',
            content:
               'Selama tiga bulan pasien sering merasa panas, sulit tidur, mudah cemas, dan mengalami jantung berdebar.'
         },
         {
            type: 'symptom',
            content:
               'Pasien juga mengeluhkan tangan gemetar, sering buang air besar, mudah berkeringat, dan kelemahan pada otot paha.'
         },
         {
            type: 'physical_exam',
            content:
               'Ditemukan takikardia, tremor halus, pembesaran kelenjar tiroid yang merata, dan kedua bola mata tampak lebih menonjol.'
         },
         {
            type: 'diagnostic',
            content:
               'Pemeriksaan menunjukkan TSH sangat rendah, FT4 meningkat, dan antibodi terhadap reseptor TSH memberikan hasil positif.'
         }
      ]
   },
   {
      icdCode: 'FA01.0',
      name: 'Osteoartritis primer lutut',
      description:
         'Penyakit degeneratif primer pada sendi lutut yang menyebabkan kerusakan tulang rawan, nyeri, kekakuan, dan keterbatasan gerak.',
      variantName: 'Kasus nyeri lutut degeneratif',
      clues: [
         {
            type: 'demographic',
            content:
               'Seorang perempuan berusia 62 tahun dengan obesitas datang karena nyeri pada kedua lutut.'
         },
         {
            type: 'history',
            content:
               'Nyeri berkembang perlahan selama beberapa tahun dan semakin terasa ketika berjalan jauh, menaiki tangga, atau berdiri lama.'
         },
         {
            type: 'symptom',
            content:
               'Pasien mengalami kekakuan setelah bangun tidur yang berlangsung kurang dari tiga puluh menit dan membaik setelah bergerak.'
         },
         {
            type: 'physical_exam',
            content:
               'Ditemukan krepitasi, pembesaran tulang pada sendi, nyeri saat digerakkan, dan penurunan rentang gerak tanpa kemerahan sistemik.'
         },
         {
            type: 'diagnostic',
            content:
               'Foto radiografi menunjukkan penyempitan celah sendi, pembentukan osteofit, dan sklerosis tulang subkondral.'
         }
      ]
   }
]

module.exports = {
   clinicalCases
}
