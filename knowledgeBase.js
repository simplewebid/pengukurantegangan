window.VOLTA_LEARN_KNOWLEDGE_BASE = [
  {
    id: "tegangan-ac",
    intent: "definisi_ac",
    title: "Tegangan AC",
    keywords: ["ac", "tegangan ac", "arus bolak balik", "bolak balik", "sinus", "sinusoidal", "pln", "transformator", "vrms"],
    answer: "Tegangan AC adalah tegangan bolak-balik yang nilai dan polaritasnya berubah secara periodik. Pada praktikum VOLTA-LEARN, AC dipelajari melalui transformator dan bentuk gelombang sinus yang dapat diamati dengan osiloskop."
  },
  {
    id: "tegangan-dc",
    intent: "definisi_dc",
    title: "Tegangan DC",
    keywords: ["dc", "tegangan dc", "arus searah", "searah", "polaritas tetap", "baterai", "power supply", "psu"],
    answer: "Tegangan DC adalah tegangan searah dengan polaritas tetap, misalnya dari baterai atau power supply. Saat mengukur DC, probe merah harus ke terminal positif dan probe hitam ke terminal negatif."
  },
  {
    id: "perbedaan-ac-dc",
    intent: "perbedaan_ac_dc",
    title: "Perbedaan AC dan DC",
    keywords: ["perbedaan", "beda", "ac dc", "dc ac", "bandingkan", "arah arus", "frekuensi", "polaritas"],
    answer: "AC berubah arah dan memiliki frekuensi, sedangkan DC memiliki arah dan polaritas tetap. AC biasanya berasal dari PLN atau transformator, sedangkan DC berasal dari baterai atau power supply."
  },
  {
    id: "multimeter",
    intent: "penggunaan_multimeter",
    title: "Multimeter",
    keywords: ["multimeter", "avometer", "voltmeter", "analog", "selector", "selektor", "acv", "dcv", "batas ukur", "range", "skala"],
    answer: "Multimeter digunakan dengan memilih mode yang benar, ACV untuk tegangan AC dan DCV untuk tegangan DC. Mulai dari batas ukur tertinggi, hubungkan probe paralel dengan sumber, lalu baca skala sesuai range yang dipilih."
  },
  {
    id: "osiloskop",
    intent: "penggunaan_osiloskop",
    title: "Osiloskop",
    keywords: ["osiloskop", "oscilloscope", "cro", "gelombang", "amplitudo", "periode", "frekuensi", "time div", "volt div", "0v"],
    answer: "Osiloskop digunakan untuk melihat bentuk gelombang tegangan terhadap waktu. Pada sinyal AC, osiloskop membantu membaca amplitudo, periode, frekuensi, dan posisi garis referensi 0V."
  },
  {
    id: "k3-laboratorium",
    intent: "k3",
    title: "K3 Laboratorium",
    keywords: ["k3", "keselamatan", "laboratorium", "aman", "apd", "praktikum", "kabel", "sumber tegangan", "bahaya", "sengatan"],
    answer: "K3 praktikum dilakukan dengan memeriksa alat, memastikan kabel dan probe baik, mematikan sumber saat merangkai, menjaga meja tetap kering, dan mengikuti instruksi dosen atau laboran."
  },
  {
    id: "simulasi-pengukuran",
    intent: "simulasi",
    title: "Simulasi Pengukuran",
    keywords: ["simulasi", "virtual lab", "v-lab", "latihan", "pra praktikum", "pengukuran", "simulasi virtual"],
    answer: "Simulasi pengukuran membantu mahasiswa berlatih memilih mode alat, batas ukur, membaca skala, dan memahami risiko kesalahan sebelum masuk ke laboratorium nyata."
  },
  {
    id: "kesalahan-polaritas",
    intent: "kesalahan_polaritas",
    title: "Kesalahan Polaritas Probe",
    keywords: ["polaritas", "probe terbalik", "merah hitam", "terminal positif", "terminal negatif", "jarum kiri", "negatif"],
    answer: "Kesalahan polaritas terjadi saat probe DC dipasang terbalik. Dampaknya pembacaan menjadi negatif atau jarum analog bergerak ke arah yang salah. Hindari dengan memastikan merah ke positif dan hitam ke negatif."
  },
  {
    id: "kesalahan-range",
    intent: "kesalahan_range",
    title: "Kesalahan Memilih Range Multimeter",
    keywords: ["range salah", "batas ukur salah", "batas ukur", "over range", "jarum mentok", "range", "terlalu kecil"],
    answer: "Range yang terlalu kecil dapat membuat jarum mentok dan berisiko merusak alat. Gunakan batas ukur tertinggi terlebih dahulu, lalu turunkan bertahap agar pembacaan lebih jelas."
  },
  {
    id: "kesalahan-skala-analog",
    intent: "kesalahan_skala",
    title: "Kesalahan Membaca Skala Analog",
    keywords: ["skala analog", "salah baca", "paralaks", "faktor skala", "penunjukan jarum", "jarum", "skala penuh"],
    answer: "Kesalahan membaca skala analog terjadi ketika skala penuh tidak disesuaikan dengan range. Gunakan rumus hasil ukur = batas ukur / skala penuh x penunjukan jarum."
  },
  {
    id: "kesalahan-probe",
    intent: "kesalahan_probe",
    title: "Kesalahan Menghubungkan Probe",
    keywords: ["menghubungkan probe", "sambungan probe", "probe", "terminal", "parallel", "paralel", "seri", "kabel probe"],
    answer: "Probe voltmeter harus dipasang paralel terhadap titik yang diukur. Pastikan probe berada pada terminal alat yang benar dan tidak menyentuh bagian aktif secara sembarangan."
  },
  {
    id: "lab-anxiety",
    intent: "lab_anxiety",
    title: "Lab-Anxiety",
    keywords: ["lab anxiety", "lab-anxiety", "cemas", "kecemasan", "takut praktikum", "grogi", "percaya diri", "mitigasi"],
    answer: "Lab-anxiety adalah kecemasan saat menghadapi praktikum. VOLTA-LEARN membantu menguranginya melalui materi ringkas, simulasi, skenario kesalahan, dan latihan evaluasi sebelum praktik nyata."
  },
  {
    id: "deep-learning",
    intent: "deep_learning",
    title: "Deep Learning",
    keywords: ["deep learning", "pembelajaran mendalam", "memahami", "analisis", "refleksi", "konsep", "stimulasi"],
    answer: "Deep learning dalam VOLTA-LEARN berarti mahasiswa tidak hanya menghafal langkah, tetapi memahami konsep AC/DC, alasan prosedur K3, dampak kesalahan, dan cara membaca alat ukur secara bermakna."
  },
  {
    id: "pre-test",
    intent: "pre_test",
    title: "Pre-Test",
    keywords: ["pretest", "pre-test", "tes awal", "sebelum belajar", "diagnostik", "awal"],
    answer: "Pre-test digunakan untuk mengetahui pemahaman awal mahasiswa sebelum belajar atau simulasi. Hasilnya membantu mahasiswa mengenali bagian materi yang perlu diperkuat."
  },
  {
    id: "post-test",
    intent: "post_test",
    title: "Post-Test",
    keywords: ["posttest", "post-test", "tes akhir", "setelah belajar", "evaluasi akhir", "akhir"],
    answer: "Post-test digunakan setelah belajar untuk mengevaluasi penguasaan materi. Nilainya membantu melihat peningkatan pemahaman setelah menggunakan VOLTA-LEARN."
  },
  {
    id: "rekap-hasil",
    intent: "rekap",
    title: "Rekap Hasil",
    keywords: ["rekap", "hasil", "skor", "nilai", "benar", "salah", "akurasi", "keterangan hasil", "evaluasi"],
    answer: "Rekap hasil menampilkan jumlah soal, jawaban benar, jawaban salah, skor akhir, dan keterangan hasil. Rekap membantu mahasiswa menilai kesiapan sebelum praktikum."
  },
  {
    id: "tujuan-volta-learn",
    intent: "tujuan",
    title: "Tujuan VOLTA-LEARN",
    keywords: ["tujuan", "volta learn", "volta-learn", "media", "v-lab", "pra praktikum", "produk"],
    answer: "Tujuan VOLTA-LEARN adalah membantu mahasiswa mempersiapkan praktikum pengukuran tegangan AC dan DC melalui materi, prosedur, simulasi, kesalahan pengukuran, dan evaluasi."
  },
  {
    id: "manfaat-volta-learn",
    intent: "manfaat",
    title: "Manfaat VOLTA-LEARN",
    keywords: ["manfaat", "keunggulan", "fungsi", "membantu", "volta learn", "volta-learn", "siap praktikum"],
    answer: "Manfaat VOLTA-LEARN adalah meningkatkan kesiapan praktikum, memperjelas konsep alat ukur, mengurangi kesalahan, membantu mitigasi lab-anxiety, dan mendukung pembelajaran mandiri."
  }
];

window.VOLTA_LEARN_QUICK_QUESTIONS = [
  "Apa itu tegangan AC?",
  "Apa itu tegangan DC?",
  "Bagaimana cara menggunakan multimeter?",
  "Bagaimana cara menggunakan osiloskop?",
  "Apa saja prosedur K3 sebelum praktikum?",
  "Apa kesalahan umum saat mengukur tegangan?",
  "Mengapa mahasiswa perlu simulasi sebelum praktikum?",
  "Bagaimana cara mengurangi lab-anxiety sebelum praktikum?"
];
