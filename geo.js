/* ============================================================
   Cambodia administrative divisions: province > district > commune.
   Source: NCDD official gazetteer (db.ncdd.gov.kh), via the
   cambodia-gazetteer dataset. 25 provinces, 1,652 communes.
   English romanisation is the official NCDD spelling.
   ============================================================ */
const CRM_GEO = {
"Phnom Penh":{
"Boeng Keng Kang":["Boeng Keng Kang Ti Bei","Boeng Keng Kang Ti Muoy","Boeng Keng Kang Ti Pir","Olympic","Tumnob Tuek","Tuol Svay Prey Ti Muoy","Tuol Svay Prey Ti Pir"],
"Chamkar Mon":["Boeng Trabaek","Phsar Daeum Thkov","Tonle Basak","Tuol Tumpung Ti Muoy","Tuol Tumpung Ti Pir"],
"Chbar Ampov":["Chbar Ampov Ti Pir","Chhbar Ampov Ti Muoy","Kbal Kaoh","Nirouth","Preaek Aeng","Preaek Pra","Preaek Thmei","Veal Sbov"],
"Chraoy Chongvar":["Bak Kaeng","Chrouy Changvar","Kaoh Dach","Preaek Lieb","Preaek Ta Sek"],
"Dangkao":["Cheung Aek","Dangkao","Kong Noy","Krang Pongro","Pong Tuek","Preaek Kampues","Prey Sa","Prey Veaeng","Roluos","Sak Sampov","Spean Thma","Tien"],
"Doun Penh":["Boeng Reang","Chakto Mukh","Chey Chummeah","Phsar Chas","Phsar Kandal Ti Muoy","Phsar Kandal Ti Pir","Phsar Thmei Ti Bei","Phsar Thmei Ti Muoy","Phsar Thmei Ti Pir","Srah Chak","Voat Phnum"],
"Kamboul":["Boeng Thum","Kamboul","Kantaok","Ovlaok","Phleung Chheh Roteh","Prateah Lang","Snaor"],
"Mean Chey":["Boeng Tumpun 1","Boeng Tumpun 2","Chak Angrae Kraom","Chak Angrae Leu","Stueng Mean chey 1","Stueng Mean chey 2","Stueng Mean chey 3"],
"Praek Pnov":["Kouk Roka","Ponhea Pon","Ponsang","Preaek Phnov","Samraong"],
"Prampir Meakkakra":["Boeng Proluet","Mittapheap","Monourom","Ou Ruessei Ti Bei","Ou Ruessei Ti Buon","Ou Ruessei Ti Muoy","Ou Ruessei Ti Pir","Veal Vong"],
"Pur SenChey":["Chaom Chau 1","Chaom Chau 2","Chaom Chau 3","Kakab 1","Kakab 2","Samraong Kraom","Trapeang Krasang"],
"Russey Keo":["Chrang Chamreh Ti Muoy","Chrang Chamreh Ti Pir","Kilomaetr Lekh Prammuoy","Ruessei Kaev","Svay Pak","Tuol Sangkae 1","Tuol Sangkae 2"],
"Saensokh":["Khmuonh","Kouk Khleang","Krang Thnong","Ou Baek K'am","Phnom Penh Thmei","Tuek Thla"],
"Tuol Kouk":["Boeng Kak Ti Muoy","Boeng Kak Ti Pir","Boeng Salang","Phsar Daeum Kor","Phsar Depou Ti Bei","Phsar Depou Ti Muoy","Phsar Depou Ti Pir","Tuek L'ak Ti Bei","Tuek L'ak Ti Muoy","Tuek L'ak Ti Pir"]
},
"Banteay Meanchey":{
"Malai":["Boeng Beng","Malai","Ou Sampoar","Ou Sralau","Ta Kong","Tuol Pongro"],
"Mongkol Borei":["Banteay Neang","Bat Trang","Chamnaom","Kouk Ballangk","Koy Maeng","Ou Prasat","Phnum Touch","Rohat Tuek","Ruessei Kraok","Sambuor","Soea","Srah Reang","Ta Lam"],
"Ou Chrov":["Changha","Koub","Kuttasat","Ou Beichoan","Samraong","Soengh","Souphi"],
"Paoy Paet":["Nimitt","Ou Chrov","Ou Reusey","Paoy Paet","Phsar Kandal"],
"Phnum Srok":["Nam Tau","Phnum Dei","Ponley","Poy Char","Spean Sraeng","Srah Chik"],
"Preah Netr Preah":["Bos Sbov","Chnuor Mean Chey","Chob Vari","Phnum Lieb","Prasat","Preak Netr Preah","Rohal","Tean Kam","Tuek Chour"],
"Serei Saophoan":["Kampong Svay","Kaoh Pong Satv","Mkak","Ou Ambel","Phniet","Preah Ponlea","Tuek Thla"],
"Svay Chek":["Phkoam","Roluos","Sarongk","Sla Kram","Svay Chek","Ta Baen","Ta Phou","Treas"],
"Thma Puok":["Banteay Chhmar","Kouk Kakthen","Kouk Romiet","Kumru","Phum Thmei","Thma Puok"]
},
"Battambang":{
"Aek Phnum":["Kaoh Chiveang","Peam Aek","Preaek Khpob","Preaek Luong","Preaek Norint","Prey Chas","Samraong Knong"],
"Banan":["Bay Damram","Chaeng Mean Chey","Chheu Teal","Kantueu Muoy","Kantueu Pir","Phnum Sampov","Snoeng","Ta Kream"],
"Battambang":["Chomkar Somraong","Kdol Doun Teav","OMal","Ou Char","Prek Preah Sdach","Rottanak","Sla Ket","Svay Por","Tuol Ta Ek","wat Kor"],
"Bavel":["Ampil Pram Daeum","Bavel","Boeung Pram","Bouvel","Kdol Ta Haen","Khlaeng Meas","Khnach Romeas","Lvea","Prey Khpos"],
"Kamrieng":["Boeng Reang","Kamrieng","Ou Da","Ta Krei","Ta Saen","Trang"],
"Koas Krala":["Chhnal Moan","Doun Ba","Hab","Kaos Krala","Preah Phos","Thipakdei"],
"Moung Ruessei":["Chrey","Kakaoh","Kear","Moung","Prey Svay","Prey Touch","Robas Mongkol","Ruessei Krang","Ta Loas"],
"Phnum Proek":["Barang Thleak","Bour","Ou Rumduol","Pech Chenda","Phnum Proek"],
"Rotonak Mondol":["Andaeuk Haeb","Phlov Meas","Reaksmei Songha","Sdau","Traeng"],
"Rukh Kiri":["Basak","Mukh Reah","Preaek Chik","Prey Tralach","Sdok Pravoek"],
"Samlout":["Kampong Lpov","Mean Chey","Ou Samril","Samlout","Sung","Ta Sanh","Ta Taok"],
"Sampov Lun":["Angkor Ban","Chrey Seima","Sampov Lun","Santepheap","Serei Mean Chey","Ta Sda"],
"Sangkae":["Anlong Vil","Kampong Preah","Kampong Prieng","Norea","Ou Dambang Muoy","Ou Dambang Pir","Reang Kesei","Roka","Ta Pon","Vaot Ta Muem"],
"Thma Koul":["Anlong Run","Bansay Traeng","Boeng Pring","Chrey","Chrouy Sdau","Kouk Khmum","Ou Ta Ki","Rung Chrey","Ta Meun","Ta Pung"]
},
"Kampong Cham":{
"Batheay":["Batheay","Chbar Ampov","Chealea","Cheung Prey","Me Pring","Ph'av","Sambour","Sandaek","Tang Krang","Tang Krasang","Trab","Tumnob"],
"Chamkar Leu":["Bos Khnor","Chamkar Andoung","Cheyyou","Lvea Leu","Spueu","Svay Teab","Ta Ong","Ta Prok"],
"Cheung Prey":["Khnor Dambang","Kouk Rovieng","Pdau Chum","Prey Char","Pring Chrum","Sampong Chey","Sdaeung Chey","Soutib","Sramar","Trapeang Kor"],
"Kampong Cham":["Boeng Kok","Kampong Cham","Sambuor Meas","Veal Vong"],
"Kampong Siem":["Ampil","Hanchey","Kaoh Mitt","Kaoh Roka","Kaoh Samraong","Kaoh Tontuem","Kien Chrey","Kokor","Krala","Ou Svay","Ro'ang","Rumchek","Srak","Trean","Vihear Thum"],
"Kang Meas":["Angkor Ban","Kang Ta Noeng","Khchau","Peam Chi Kang","Preaek Koy","Preaek Krabau","Reay Pay","Roka Ar","Roka Koy","Sdau","Sour Kong"],
"Kaoh Soutin":["Kampong Reab","Kaoh Sotin","Lve","Moha Khnhoung","Moha Leaph","Peam Prathnuoh","Pongro","Preaek Ta Nong"],
"Prey Chhor":["Baray","Boeng Nay","Chrey Vien","Khvet Thum","Kor","Krouch","Lvea","Mien","Prey Chhor","Samraong","Sour Saen","Sragnae","Thma Pun","Tong Rong","Trapeang Preah"],
"Srei Santhor":["Baray","Chi Bal","Kaoh Andaet","Khnar Sa","Mean Chey","Phteah Kandal","Pram Yam","Preaek Dambouk","Preaek Pou","Preaek Rumdeng","Ruessei Srok","Svay Khsach Phnum","Svay Pou","Tong Tralach"],
"Stueng Trang":["Areaks Tnot","Dang Kdar","Khpob Ta Nguon","Me Sar Chrey","Ou Mlu","Peam Kaoh Snar","Preaek Bak","Preah Andoung","Preak Kak","Soupheas","Tuol Preah Khleang","Tuol Sambuor"]
},
"Kampong Chhnang":{
"Baribour":["Anhchanh Rung","Chak","Chhnok Tru","Kampong Preah Kokir","Khon Rang","Melum","Pech Changvar","Phsar","Ponley","Popel","Trapeang Chan"],
"Chol Kiri":["Chol Sar","Kampong Ous","Kaoh Thkov","Peam Chhkaok","Prey Kri"],
"Kampong Chhnang":["B'er","Kampong Chhnang","Khsam","Phsar Chhnang"],
"Kampong Leaeng":["Chranouk","Dar","Kampong Hau","Phlov Tuk","Pou","Pralay Meas","Samraong Saen","Svay Rumpear","Trangel"],
"Kampong Tralach":["Ampil Tuek","Chhuk Sa","Chres","Kampong Tralach","Longveaek","Ou Ruessei","Peani","Saeb","Ta Ches","Thma Edth"],
"Rolea B'ier":["Andoung Snay","Banteay Preal","Cheung Kreav","Chrey Bak","Kouk Banteay","Krang Leav","Phnom Kraing Dey Meas","Pongro","Prasnoeb","Prey Mul","Rolea B'ier","Srae Thmei","Svay Chrum","Tuek Hout"],
"Sameakki Mean Chey":["Chhean Laeung","Khnar Chhmar","Krang Lvea","Peam","Sedthei","Svay","Svay Chuk","Tbaeng Khpos","Thlok Vien"],
"Tuek Phos":["Akphivoadth","Chaong Maong","Chieb","Kbal Tuek","Kdol Saen Chey","Khlong Popok","Krang Skear","Tang Krasang","Tuol Khpos"]
},
"Kampong Speu":{
"Aoral":["Haong Samnam","Reaksmei Sameakki","Sangkae Satob","Ta Sal","Trapeang Chour"],
"Basedth":["Basedth","Kak","Kat Phluk","Nitean","Pheakdei","Pheari Mean Chey","Phong","Pou Angkrang","Pou Chamraeun","Pou Mreal","Preah Khae","Svay Chacheb","Svay Rumpear","Tuol Ampil","Tuol Sala"],
"Chbar Mon":["Chbar Mon","Kandaol Dom","Rokar Thum","Sopoar Tep","Svay Kravan"],
"Kong Pisei":["Angk Popel","Chongruk","Moha Ruessei","Pechr Muni","Preah Nipean","Prey Nheat","Prey Vihear","Roka Kaoh","Sdok","Snam Krapeu","Srang","Tuek L'ak","Veal"],
"Odongk Maechay":["Khsem Khsant","Preah Srae","Trach Tong","Veal Pong","Veang Chas"],
"Phnum Sruoch":["Chambak","Choam Sangkae","Dambouk Rung","Kiri Voan","Krang Dei Vay","Moha Sang","Ou","Prey Kmeng","Prey Rumduol","Tang Samraong","Tang Sya","Traeng Trayueng","Yeay Mao Pichnil"],
"Samkkei Munichay":["Chan Saen","Cheung Roas","Chumpu Proeks","Damnak Reang","Krang Chek","Mean Chey","Peang Lvea","Phnom Touch","Prey Krasang","Yutth Sameakki"],
"Samraong Tong":["Kahaeng","Khtum Krang","Krang Ampil","Pneay","Roleang Chak","Roleang Kreul","Saen Dei","Sambour","Samrong Tong","Skuh","Tang Krouch","Thummoda Ar","Trapeang Kong","Tumpoar Meas","Voa Sar"],
"Thpong":["Amleang","Monourom","Prambei Mum","Rung Roeang","Toap Mean","Veal Pon","Yea Angk"]
},
"Kampong Thom":{
"Baray":["Bak Sna","Ballangk","Baray","Boeng","Chaeung Daeung","Chhuk Khsach","Chong Doung","Kokir Thum","Krava","Tnaot Chum"],
"Kampong Svay":["Chey","Damrei Slab","Kampong Kou","Kampong Svay","Kdei Doung","Nipech","Phat Sanday","Prey Kuy","San Kor","Tbaeng","Trapeang Ruessei"],
"Prasat Ballangk":["Doung","Kraya","Phan Nheum","Sakream","Sala Visai","Sameakki","Tuol Kreul"],
"Prasat Sambour":["Chhuk","Koul","Sambour","Sraeung","Tang Krasau"],
"Sandan":["Chheu Teal","Dang Kambet","Klaeng","Mean Chey","Mean Rith","Ngan","Sandan","Sochet","Tum Ring"],
"Santuk":["Boeng Lvea","Chroab","Kakaoh","Kampong Thma","Kraya","Pnov","Prasat","Tang Krasang","Tboung Krapeu","Ti Pou"],
"Stoung":["Banteay Stoung","Chamna Kraom","Chamna Leu","Kampong Chen Cheung","Kampong Chen Tboung","Msa Krang","Peam Bang","Popok","Pralay","Preah Damrei","Rung Roeang","Samprouch","Trea"],
"Stueng Saen":["Achar Leak","Damrei Choan Khla","Kampong Krabau","Kampong Roteh","Kampong Thum","Ou Kanthor","Prey Ta Hu","Srayov"],
"Taing Kouk":["Andoung Pou","Chraneang","Chrolong","Pongro","Sou Young","Sralau","Svay Phleung","Triel"]
},
"Kampot":{
"Angkor Chey":["Angk Phnum Touch","Ankor Chey","Champei","Daeum Doung","Dambouk Khpos","Dan Koum","Mroum","Phnum Kong","Praphnum","Samlanh","Tani"],
"Banteay Meas":["Banteay Meas Khang Kaeut","Banteay Meas Khang lech","Prey Tonle","Samraong Kraom","Samraong Leu","Sdach Kong Khang Cheung","Sdach Kong Khang Tboung","Sdach Kong Khang lech","Tnoat Chong Srang","Trapeang Sala Khang Kaeut","Trapeang Sala Khang Lech","Tuk Meas Khang Kaeut","Tuk Meas Khang Lech","Voat Angk Khang Cheung","Voat Angk Khang Tboung"],
"Bokor":["Boeng Tuk","Kaoh Touch","Preaek Tnoat"],
"Chhuk":["Baniev","Boeng Nimol","Chhuk","Dechou Akphivoadth","Doun Yay","Krang Sbov","Krang Snay","Lbaeuk","Mean Chey","Neareay","Satv Pong","Takaen","Tramaeng","Trapeang Bei","Trapeang Phleang"],
"Chum Kiri":["Chres","Chumpu Voan","Snay Anhchit","Srae Chaeng","Srae Knong","Srae Samraong","Trapeang Reang"],
"Dang Tong":["Angk  Romeas","Damnak Sokram","Dang Tong","Khcheay Khang Cheung","Khcheay Khang Tboung","L'ang","Mean Ritth","Srae Chea Khang Cheung","Srae Chea Khang Tboung","Totung"],
"Kampong Trach":["Ang Sophy","Boeng Sala Khang Cheung","Boeng Sala Khang Tboung","Damnak Kantuot Khang Cheung","Damnak Kantuot Khang Tboung","Kampong Trach Khang Kaeut","Kampong Trach Khang Lech","Phnom Prasat","Prasat Phnom Khyang","Preaek Kroes","Ruessei Srok Khang Kaeut","Ruessei Srok Khang Lech","Svay Tong Khang Cheung","Svay Tong Khang Tboung"],
"Kampot":["Andoung Khmer","Kampong Bay","Kampong Kandal","Krang Ampil","Traeuy Kaoh"],
"Tuek Chhou":["Chum Kriel","Kampong Kraeng","Kampong Samraong","Kandaol","Koun Satv","Makprang","Prey Khmum","Prey Thnang","Stueng Kaev","Thmei","Trapeang Pring","Trapeang Sangkae","Trapeang Thum"]
},
"Kandal":{
"Akreiy Ksatr":["Akreiy Ksatr","Bak Dav","Barong","Kaoh Oknha Tei","Peam Oknha Ong","Preaek Ampil","Preaek Kmeng","Preaek Luong","Preaek Ta kov","Sarikakaev","Svay Chrum"],
"Angk Snuol":["Baek Chan","Chhak Chheu Neang","Damnak Ampil","Krang Mkak","Lumhach","Mkak","Peuk","Prey Puoch","Samraong Leu","Tuol Prech"],
"Kandal Stueng":["Ampov Prey","Anlong Romiet","Barku","Boeng Khyang","Cheung Kaeub","Daeum Rues","Kandaok","Kouk Trab","Preaek Roka","Preaek Slaeng","Preah Putth","Roka","Roleang Kaen","Siem Reab","Tbaeng","Thmei","Trapeang Veaeng","Trea"],
"Kaoh Thum":["Kampong Kong","Kaoh Thum Ka","Kaoh Thum Kha","Leuk Daek","Pouthi Ban","Preaek Thmei"],
"Khsach Kandal":["Chey Thum","Kampong Chamlang","Kaoh Chouram","Preaek Ta Meak","Preah Prasab","Puk Ruessei","Roka Chonlueng","Sanlung","Sithor","Svay Romiet","Ta Aek","Vihear Suork"],
"Kien Svay":["Banteay Daek","Chheu Teal","Dei Edth","Kampong Svay","Kokir","Kokir Thum","Phum Thum","Samraong Thum"],
"Leuk Daek":["K'am Samnar","Kampong Phnum","Khpob Ateav","Peam Reang","Preaek Dach","Preaek Tonloab","Sandar"],
"Lvea Aem":["Boeng Krum","Kaoh Kaev","Kaoh Reah","Lvea Sar","Phum Thum","Preaek Rey","Preaek Ruessei","Sambuor","Thma Kor","Tuek Khleang"],
"Mukh Kampul":["Preaek Anhchanh","Preaek Dambang","Roka Kong Ti Muoy","Roka Kong Ti Pir","Ruessei Chrouy","Sambuor Meas","Svay Ampear"],
"Ponhea Lueu":["Chhveang","Chrey Loas","Kampong Luong","Kampong Os","Kaoh Chen","Phnum Bat","Phsar Daek","Ponhea Lueu","Preaek Ta Teaen","Tumnob Thum","Vihear Luong"],
"S'ang":["Kaoh Khael","Kaoh Khsach Tonlea","Khpob","Krang Yov","Prasat","Preaek Ambel","Preaek Koy","S'ang Phnum","Svay Prateal","Ta Lon","Traeuy Sla","Tuek Vil"],
"Sampeou Poun":["Chheu Kmau","Chrouy Ta Kaev","Preaek Sdei","Prea​ek Chrey","Sampeou Poun"],
"Ta Khmau":["Doeum Mien","Kampong Samnanh","Kaoh Anlong Chen","Prek Ho","Prek Ruessey","Roka Khpos","Setbou","Svay Rolum","Ta Kdol","Ta Khmao"]
},
"Kep":{
"Damnak Chang'aeur":["Angkaol","Pong Tuek"],
"Kaeb":["Kaeb","Ou Krasar","Prey Thum"]
},
"Koh Kong":{
"Botum Sakor":["Andoung Tuek","Kandaol","Ta Noun","Thma Sa"],
"Kaoh Kong":["Chrouy Pras","Kaoh Kapi","Ta Tai Kraom","Trapeang Rung"],
"Khemara Phoumin":["Dang Tong","Smach Mean Chey","Stueng Veaeng"],
"Kiri Sakor":["Kaoh Sdach","Phnhi Meas","Preaek Khsach"],
"Mondol Seima":["Pak Khlang","Peam Krasaob","Tuol Kokir"],
"Srae Ambel":["Boeng Preav","Chi Kha Kraom","Chi kha Leu","Chrouy Svay","Dang Peaeng","Srae Ambel"],
"Thma Bang":["Chi Phat","Chumnoab","Pralay","Ruessei Chrum","Ta Tey Leu","Thma Doun Pov"]
},
"Kratie":{
"Chetr Borei":["Bos Leav","Changkrang","Dar","Kantuot","Kaoh Chraeng","Kou Loab","Sambok","Thma Andaeuk","Thma Kreae","Thmei"],
"Chhloung":["Chhloung","Damrei Phong","Han Chey","Kampong Damrei","Kanhchor","Khsach Andeth","Pongro","Preaek Saman"],
"Kracheh":["Kaoh Trong","Kracheh","Krakor","Ou Ruessei","Roka Kandal"],
"Or Krieng Saenchay":["Kbal Damrei","Ou Krieng","Oukondear Senchey","Roluos Mean Chey","Srae Chis"],
"Prek Prasab":["Chambâk","Chrouy Banteay","Kampong Kor","Koh Ta Suy","Preaek Prasab","Russey Keo","Saob","Ta Mao"],
"Sambour":["Boeng Char","Kampong Cham","Kaoh Khnhaer","Sambour","Sandan","Voadthonak"],
"Snuol":["Khsuem","Kronhoung Saen Chey","Pir Thnu","Snuol","Srae Char","Svay Chreah"]
},
"Mondulkiri":{
"Kaev Seima":["Chong Phlah","Memang","Srae Chhuk","Srae Khtum","Srae Preah"],
"Kaoh Nheaek":["A Buon Leu","Nang Khi Lik","Roya","Sokh Sant","Srae Huy","Srae Sangkum"],
"Ou Reang":["Dak Dam","Saen Monourom"],
"Pech Chreada":["Bu Sra","Krang Teh","Pu Chrey","Srae Ampum"],
"Saen Monourom":["Monourom","Romonea","Sokh Dom","Spean Mean Chey"]
},
"Oddar Meanchey":{
"Anlong Veaeng":["Anlong Veaeng","Lumtong","Thlat","Trapeang Prei","Trapeang Tav"],
"Banteay Ampil":["Ampil","Beng","Kouk Khpos","Kouk Mon"],
"Chong Kal":["Cheung Tien","Chong Kal","Krasang","Pongro"],
"Samraong":["Bansay Reak","Bos Sbov","Koun Kriel","Ou Smach","Samraong"],
"Trapeang Prasat":["Bak Anloung","Ou Svay","Ph'av","Preah Pralay","Trapeang Prasat","Tumnob Dach"]
},
"Pailin":{
"Pailin":["Bar Yakha","Ou Ta Vau","Pailin","Tuol Lvea"],
"Sala Krau":["Ou Andoung","Sala Krau","Stueng Kach","Stueng Trang"]
},
"Preah Sihanouk":{
"Kampong Seila":["Chamkar Luong","Kampong Seila","Ou Bak Roteh","Stueng Chhay"],
"Kaoh Rung":["Kaoh Rung","Koah Rung Sonlem"],
"Preah Sihanouk":["Bei","Buon","Pir","lek Muoy"],
"Prey Nob":["Andoung Thma","Bet Trang","Boeng Ta Prum","Cheung Kou","Ou Chrov","Ou Oknha Heng","Prey Nob","Ream","Sameakki","Samrong","Ta Ney","Tuek L'ak","Tuek Thla","Tuol Totueng","Veal Renh"],
"Stueng Hav":["Kaev Phos","Kampenh","Ou Treh","Tumnob Rolok"]
},
"Preah Vihear":{
"Chey Saen":["Chrach","Khyang","Putrea","S'ang","Tasu","Thmea"],
"Chhaeb":["Chhaeb Muoy","Chhaeb Pir","Kampong Sralau Muoy","Kampong Sralau Pir","Mlu Prey Muoy","Mlu Prey Pir","Sangkae Muoy","Sangkae Pir"],
"Choam Ksant":["Choam Ksant","Kantuot","Morokot","Pring Thum","Rumdaoh Srae","Sror Aem","Tuek Kraham","Yeang"],
"Kuleaen":["Kuleaen Cheung","Kuleaen Tboung","Phnum Penh","Phnum Tbaeng Pir","Srayang","Thmei"],
"Preah Vihear":["Kampong Pranak","Pal Hal"],
"Rovieng":["Reaksa","Reaksmei","Rieb Roy","Rik Reay","Robieb","Rohas","Romoneiy","Romtum","Rotanak","Rumdaoh","Rung Roeang","Ruos Roan"],
"Sangkum Thmei":["Chamraeun","Phnum Tbaeng Muoy","Ro'ang","Ronak Ser","Sdau"],
"Tbaeng Mean Chey":["Chhean Mukh","Pou","Prame","Preah Khleang"]
},
"Prey Veng":{
"Ba Phnum":["Boeng Preah","Cheung Phnum","Chheu Kach","Reaks Chey","Roung Damrei","Sdau Kaong","Spueu Ka","Spueu Kha","Theay"],
"Kamchay Mear":["Cheach","Doun Koeng","Krabau","Kranhung","Seang Khveang","Smaong Khang Cheung","Smaong Khang Tboung","Trabaek"],
"Kampong Trabaek":["Ansaong","Cham","Cheang Daek","Chrey","Kampong Trabaek","Kansoam Ak","Kou Khchak","Peam Montear","Prasat","Pratheat","Prey Chhor","Prey Poun","Thkov"],
"Kanhchriech":["Chong Ampil","Kanhchriech","Kdoeang Reay","Kouk Kong Kaeut","Kouk Kong Lech","Preal","Thma Pun","Tnaot"],
"Me Sang":["Angkor Sar","Chi Phoch","Chres","Prey Khnes","Prey Rumdeng","Prey Totueng","Svay Chrum","Trapeang Srae"],
"Pea Reang":["Kampong Popil","Kampong Prang","Kanhcham","Mesar Prachan","Prey Pnov","Prey Sniet","Prey Sralet","Reab","Roka"],
"Peam Chor":["Angkor Angk","Kampong Prasat","Kaoh Chek","Kaoh Roka","Kaoh Sampov","Krang Ta Yang","Preaek Krabau","Preaek Sambuor","Ruessei Srok","Svay Phluoh"],
"Peam Ro":["Ba Baong","Banlich Prasat","Neak Loeang","Peam Mean Chey","Peam Ro","Preaek Khsay Ka","Preaek Khsay Kha","Prey Kandieng"],
"Preah Sdach":["Angkor Reach","Banteay Chakrei","Boeng Daol","Chey Kampok","Kampong Soeng","Krang Svay","Lvea","Preah Sdach","Reathor","Rumchek","Sena Reach Otdam"],
"Prey Veng":["Baray","Cheung Tuek","Kampong Leav","Ta Kao"],
"Pur Rieng":["Kampong Ruessei","Pou Rieng","Preaek Anteah","Preaek Chrey","Preaek Ta Sar","Prey Kanlaong"],
"Sithor Kandal":["Ampil Krau","Chrey Khmum","Lve","Pnov Ti Muoy","Pnov Ti Pir","Pou Ti","Preaek Changkran","Prey Daeum Thnoeng","Prey Tueng","Ruessei Sanh","Rumlech"],
"Svay Antor":["Angkor Tret","Chea Khlang","Chrey","Damrei Puon","Me Bon","Pean Roung","Popueus","Prey Khla","Samraong","Svay Antor","Tuek Thla"]
},
"Pursat":{
"Bakan":["Boeng Bat Kandaol","Boeng Khnar","Khnar Totueng","Me Tuek","Ou Ta Paong","Rumlech","Snam Preah","Svay Doun Kaev","Trapeang chorng"],
"Kandieng":["Anlong Vil","Kandieng","Kanhchor","Kaoh Chum","Reang Til","Srae Sdok","Svay Luong","Sya","Veal"],
"Krakor":["Anlong Tnaot","Ansa Chambak","Boeng Kantuot","Chheu Tom","Kampong Luong","Kampong Pou","Kbal Trach","Ou Sandan","Sna Ansa","Svay Sa","Tnaot Chum"],
"Phnum Kravanh":["Bak Chenhchien","Leach","Prongil","Rokat","Samraong","Santreae"],
"Pursat":["Banteay Dei","Chamraeun Phal","Lolok Sa","Phteah Prey","Prey Nhi","Roleab","Svay At"],
"Ta Lou Senchey":["Phteah Rung","Ta Lou"],
"Veal Veaeng":["Anlong Reab","Krapeu Pir","Ou Saom","Pramaoy","Thma Da"]
},
"Ratanakiri":{
"Andoung Meas":["Malik","Nhang","Ta Lav"],
"Ban Lung":["Boeng Kansaeng","Kachanh","Labansiek","Yeak Laom"],
"Bar Kaev":["Kak","Keh Chong","La Minh","Lung Khung","Saeung","Ting Chak"],
"Koun Mom":["Serei Mongkol","Srae Angkrorng","Ta Ang","Teun","Trapeang Chres","Trapeang Kraham"],
"Lumphat":["Ba Tang","Chey Otdam","Ka Laeng","Lbang Muoy","Lbang Pir","Seda"],
"Ou Chum":["Aekakpheap","Cha Ung","Kalai","L'ak","Ou Chum","Pouy","Sameakki"],
"Ou Ya Dav":["Bar Kham","Lum Choar","Pa Te","Pak Nhai","Saom Thum","Sesan","Ya Tung"],
"Ta Veaeng":["Ta Veaeng Kraom","Ta Veaeng Leu"],
"Veun Sai":["Hat Pak","Ka Choun","Kaoh Pang","Kaoh Peak","Kok Lak","Pa Kalan","Phnum Kok","Pong","Veun Sai"]
},
"Siem Reap":{
"Angkor Chum":["Char Chhuk","Doun Peng","Kouk Doung","Koul","Nokor Pheas","Srae Khvav","Ta Saom"],
"Angkor Thum":["Chob Ta Trav","Leang Dai","Peak Snaeng","Svay Chek"],
"Banteay Srei":["Khnar Sanday","Khun Ream","Preah Dak","Rumchek","Run Ta Aek","Tbaeng"],
"Chi Kraeng":["Anlong Samnar","Chi Kraeng","Kampong Kdei","Khvav","Kouk Thlok Kraom","Kouk Thlok Leu","Lveaeng Ruessei","Pongro Kraom","Pongro Leu","Ruessei Lok","Sangvaeuy","Spean Tnaot"],
"Kralanh":["Chanleas Dai","Kampong Thkov","Kralanh","Krouch Kor","Roung Kou","Saen Sokh","Sambuor","Snuol","Sranal","Ta An"],
"Prasat Bakong":["Ampil","Bakong","Ballangk","Kampong Phluk","Kandaek","Kantreang","Mean Chey","Roluos","Trapeang Thum"],
"Puok":["Doun Kaev","Kaev Poar","Kdei Run","Khnat","Lvea","Mukh Paen","Pou Treay","Prey Chruk","Puok","Reul","Samraong Yea","Sasar Sdam","Trei Nhoar","Yeang"],
"Siem Reap":["Chong Khnies","Chreav","Kok Chak","Krabei Riel","Nokor Thum","Sala Kamreuk","Siem Reab","Sla Kram","Sngkat Sambuor","Srangae","Svay Dankum","Tuek Vil"],
"Soutr Nikom":["Chan Sa","Dam Daek","Dan Run","Kampong Khleang","Khchas","Khnar Pou","Kien Sangkae","Popel","Samraong","Ta Yaek"],
"Srei Snam":["Chrouy Neang Nguon","Klang Hay","Moung","Prei","Slaeng Spean","Tram Sasar"],
"Svay Leu":["Boeng Mealea","Kantuot","Khnang Phnum","Svay Leu","Ta Siem"],
"Varin":["Lvea Krang","Prasat","Srae Nouy","Svay Sa","Varin"]
},
"Stung Treng":{
"Borei Ou Svay Senchey":["Kaoh Snaeng","Ou Svay","Preah Rumkel"],
"Sesan":["Kamphun","Kbal Romeas","Phluk","Samkhuoy","Sdau","Srae Kor","Ta Lat"],
"Siem Bouk":["Kaoh Preah","Kaoh Sampeay","Kaoh Sralay","Ou Mreah","Ou Ruessei Kandal","Siem Bouk","Srae Krasang"],
"Siem Pang":["Preaek Meas","Santepheap","Sekong","Srae Sambour","Tma Kaev"],
"Stueng Traeng":["Preah Bat","Sameakki","Srah Ruessei","Stueng Traeng"],
"Thala Barivat":["Anlong Chrey","Anlong Phe","Chamkar Leu","Kang Cham","Ou Rai","Sam Ang","Srae Ruessei","Thala Barivat"]
},
"Svay Rieng":{
"Bavet":["Bati","Bavet","Chrak Mtes","Prasat","Prey Angkunh"],
"Chantrea":["Chantrea","Chres","Me Sar Thngak","Prey Kokir","Samraong","Tuol Sdei"],
"Kampong Rou":["Banteay Krang","Khsaetr","Nhor","Preah Ponlea","Prey Thum","Reach Montir","Samlei","Samyaong","Svay Ta Yean","Thmei","Tnaot"],
"Romeas Haek":["Ampil","Andoung Pou","Andoung Trabaek","Angk Prasrae","Chantrei","Chrey Thum","Doung","Kampong Trach","Kokir","Krasang","Mream","Mukh Da","Sambatt Mean Chey","Sambuor","Trapeang Sdau","Tras"],
"Rumduol":["Bos Mon","Chrung Popel","Kampong Ampil","Kampong Chak","Meun Chey","Pong Tuek","Sangkae","Svay Chek","Thmea","Thna Thnong"],
"Svay Chrum":["Angk Ta Sou","Basak","Chambak","Chheu Teal","Doun Sa","Kampong Chamlang","Kouk Pring","Kraol Kou","Kruos","Pouthi Reach","Svay Angk","Svay Chrum","Svay Thum","Svay Yea","Ta Suos","Thlok"],
"Svay Rieng":["Chek","Koy Trabaek","Pou Ta Hao","Prey Chhlak","Sangkhoar","Svay Rieng","Svay Toea"],
"Svay Teab":["Kandieng Reay","Koki Saom","Monourom","Popeaet","Prasoutr","Prey Ta Ei","Romeang Thkaol","Sambuor","Svay Rumpear"]
},
"Takeo":{
"Angkor Borei":["Angkor Borei","Ba Srae","Kouk Thlok","Ponley","Preaek Phtoul","Prey Phkoam"],
"Bati":["Chambak","Champei","Doung","Kandoeng","Komar Reachea","Krang Leav","Krang Thnong","Lumpong","Pea Ream","Pot Sar","Sour Phi","Tang Doung","Tnaot","Trapeang Krasang","Trapeang Sab"],
"Borei Cholsar":["Borei Cholsar","Chey Chouk","Doung Khpos","Kampong Krasang","Kouk Pou"],
"Doun Kaev":["Baray","Roka Knong","Roka Krau"],
"Kaoh Andaet":["Krapum Chhuk","Pech Sar","Prey Khla","Prey Yuthka","Romenh","Thlea Prachum"],
"Kiri Vong":["Angk Prasat","Kamnab","Kampeaeng","Kiri Chong Kaoh","Kouk Prech","Phnum Den","Preah Bat Choan Chum","Prey Ampok","Prey Rumdeng","Ream Andaeuk","Saom","Ta Ou"],
"Prey Kabbas":["Angkanh","Ban Kam","Champa","Char","Kampeaeng","Kampong Reab","Kdanh","Pou Rumchak","Prey Kabbas","Prey Lvea","Prey Phdau","Snao","Tang Yab"],
"Samraong":["Boeng Tranh Khang Cheung","Boeng Tranh Khang Tboung","Cheung Kuon","Chumreah Pen","Khvav","Lumchang","Rovieng","Samraong","Sla","Soengh","Trea"],
"Tram Kak":["Angk Ta Saom","Cheang Tong","Kus","Leay Bour","Nhaeng Nhang","Otdam Soriya","Ou Saray","Popel","Samraong","Srae Ronoung","Ta Phem","Tram Kak","Trapeang Kranhoung","Trapeang Thum Khang Cheung","Trapeang Thum Khang Tboung"],
"Treang":["Angk Kaev","Angk Khnor","Angkanh","Chi Khma","Khvav","Prambei Mum","Prey Sloek","Roneam","Sambuor","Sanlung","Smaong","Srangae","Thlok","Tralach"]
},
"Tbong Khmum":{
"Dambae":["Chong Cheach","Dambae","Kouk Srok","Neang Teut","Seda","Trapeang Pring","Tuek Chrov"],
"Krouch Chhmar":["Chhuk","Chumnik","Kampong Treas","Kaoh Pir","Krouch Chhmar","Peus Muoy","Peus Pir","Preaek A chi","Roka Khnor","Svay Khleang","Trea","Tuol Snuol"],
"Memot":["Chan Mul","Choam","Choam Kravien","Choam Ta Mau","Dar","Kampoan","Kokir","Memong","Memot","Rumchek","Rung","Tonlung","Tramung","Triek"],
"Ou Reang Ov":["Ampil Ta Pok","Chak","Damril","Kong Chey","Mien","Preah Theat","Tuol Souphi"],
"Ponhea Kraek":["Dountei","Kak","Kandaol Chrum","Kaong Kang","Kraek","Popel","Trapeang Phlong","Veal Mlu"],
"Suong":["Suong","Vihear Luong"],
"Tboung Khmum":["Anhchaeum","Boeng Pruol","Chikor","Chirou Ti Muoy","Chirou Ti Pir","Chob","Kor","Lngieng","Mong Riev","Peam Chileang","Roka Po Pram","Sralab","Thma Pech","Tonle Bet"]
}
};
