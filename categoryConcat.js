const fs = require('fs');

const main = async () => {
    let fullProduct = []

    function fileWrite(fileName, data, fileFormat) {
        return new Promise((resolve, reject) => {                
            fs.writeFile(fileName + fileFormat, data, (err) => {
                if (err) {
                    reject(err);
                }
                resolve(console.log("Dosyaya yazma işlemi başarılı")); 
            }); 
        })
    }
    
    function productFileRead(prFileName) {
        return new Promise((resolve, reject) => {
            let prCategoryName = prFileName.split('.')[0]
    
            let categoryPr = {
                categoryName: prCategoryName,
                products: {} 
            }
    
            fs.readFile("Gıda/" + prFileName, 'utf8', (err, data) => {
                categoryPr.products = JSON.parse(data)
                fullProduct.push(...[categoryPr])
    
                if(err)
                    reject(err);
                resolve(console.log(prCategoryName + ' dosyası okundu.')); 
            });       
        })
    }
    
    var files = fs.readdirSync('Gıda/');    // Gıda klasörü içerisindeki dosyaların isimlerini oku
    
    for(let i=0; i<files.length; i++)   // Elde edilen dosya isimlerini, dosyanın içeriğini okumak için gönder
        await productFileRead(files[i])
    
    await fileWrite("Gida", JSON.stringify(fullProduct, null, 2), ".json")  // Gida.json dosyasına okunan değerleri yaz
}

main()