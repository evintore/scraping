import got from 'got'
import cheerio from 'cheerio'
const fs = require('fs');

const main = async (categoryLink, file) => {
    let category = {    // gida.html sayfasındaki linkler
        links: []
    };

    // Veri çekmek için duraklatma 
    function sleep(){
        var maxSec = 15;
        var minSec = 5;
        var ms = Math.floor(Math.random() * (maxSec - minSec + 1) + minSec) * 1000;
        return new Promise(resolve => setTimeout(resolve, ms)); 
    }

    function fileRead() {
        return new Promise((resolve, reject) => { 
            console.log('Veriler dosyadan okunuyor');
            fs.readFile(file, 'utf8', (err, data) => {
                if(err)
                    reject(err);
                resolve(category.links = JSON.parse(data));
            });
            console.log('Veriler dosyadan okundu');
        })
    }
    
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

    // Veri çekilecek sayfanın html ini alma
    const getResponseHtml = async (pageUrl) => {
        await sleep();

        let pageResponse = await got(pageUrl,{
            headers: {
                'user-agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:87.0) Gecko/20100101 Firefox/87.0`
            }
        })

        return pageResponse.body
    }

    // Kategori linklerini dosyaya yazar
    const SaveCategoryFile = async () => {
        const data = JSON.stringify(category.links);

        fs.writeFile('categoryLinks.json', data, (err) => {
            if (err) {
                throw err;
            }
            console.log("Kategori Linkleri dosyaya kaydedildi.");
        });
    }
        
    // Alt kategori sayfası mı yoksa ürün sayfası mı kontrolü
    const PageControl = async (pageUrl) => {
        
        let html = await getResponseHtml(pageUrl);

        const $ = cheerio.load(html);
            
        if($('#CPL').length === 1){
            console.log('Bulunan Kategori Linki :', pageUrl)
            category.links.push(pageUrl)    // ürünlerin bulunduğu sayfadaki linkler
        }
        else if($('.rw_v8 .gr_v8').length === 1){
            for(let i=1; i <= $('.rw_v8 .gr_v8 li').length; i++){
                var subUrl = $('.rw_v8 .gr_v8 li:nth-child('+parseInt(i)+') a').attr("href")
                
                await PageControl("https://www.XXX.com" + subUrl)
            }
            
        }
    } 

    if(!file) {  // Parametre olarak dosya gönderilmediyse
        await PageControl(categoryLink)

        await SaveCategoryFile()
    }
    else {  // Parametre olarak dosya gönderildiyse
        await fileRead()
    }

    // Kategori içerisindeki ürün işlemleri
    const Category = async () => {

        function fileAppend(fileName, data, fileFormat) {
            return new Promise((resolve, reject) => {
                fs.appendFile(fileName + fileFormat, data + '\n', (err) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(console.log("Dosyaya yazma işlemi başarılı"));
                });
            })
        }

        const saveProcessedCategory = async (processCategoryLink) => {
            const data = JSON.stringify(processCategoryLink);

            await fileAppend('processedCategories', data, '.txt');
        }

        const oneCategory = async (Link) => {
            let products = {    // ürün linkleri
                links : [],
                data: []
            };

            const SaveCategoryProducts = async () => {
                let html = await getResponseHtml(Link);
        
                const $ = cheerio.load(html);
                
                let categoryName = $('h1').text()

                let data = JSON.stringify(products.data, null, 2);

                console.log('Kategoride bulunan ürünler dosyaya kaydediliyor.');
                await fileWrite(categoryName, data, '.json');
            }
            
            // Kategorinin kaç sayfadan oluştuğunu return eder
            const getProductsMaxPageNumber = async (pageUrl) => {
                let html = await getResponseHtml(pageUrl);
        
                const $ = cheerio.load(html);
                
                let pageString = $('.pager_v8 b').text();

                (pageString === "") ? pageString = 1 : pageString = parseInt(pageString.split('/').pop())
        
                return pageString
            }
            
            // Kategori sayfasında bulunan ürünlerin linklerini alır
            const getProductsData = async (pageUrl) => {

                let html = await getResponseHtml(pageUrl);
        
                const $ = cheerio.load(html);
        
                $('#CPL li a').each(function(index, item){
                    let uri = "https://www.XXX.com" +  $(item).attr('href')
                
                    products.links.push(uri);
                })
            }
            
            let pageNumber = Math.min(20, await getProductsMaxPageNumber(Link))
            console.log('Ürün linkleri alınıyor');
            // Kategori içerisinde bulunan sayfalarda gezinme            
            for(let i=1; i<=pageNumber; i++){    
                let url = "";
        
                (i == 1) ? url = Link : url = Link.slice(0,-5) + ',' + i + ".html"

                await getProductsData(url)
            }
            console.log('Ürün linkleri alındı');
        
            // Ürünün ilgili bilgilerini getirir
            const getProductData = async (pageUrl) => {
                let product = {     // Ürün tanımlaması
                    name : "",
                    category: "",
                    imageUrl: "",
                    sellers: []
                };
                
                let html = await getResponseHtml(pageUrl);
        
                const $ = cheerio.load(html);
                
                // Ürün başlığını alır
                product.name = $('h1').text();

                // Kategori yolunu alır
                $('#BC_v8 ol li').each((function(index,item){
                    let path = $(item).find('a').attr('title')
                    if(index == 0)  // Anasayfayı alma
                        return
                    
                    (index == 1) ? product.category = product.category.concat(path) : product.category = product.category.concat(',' + path)
                }))

                product.imageUrl = $('#PI_v8 a.img_w img').attr('src')
                
                // Ürün bilgisini alır
                if($('#PL').length == 1){   // Ürün karşılaştırmalarının olduğu bölüm varsa
                    $('#PL li').each(function(index){
                        let uri = new URLSearchParams(decodeURIComponent($('#PL li:nth-child('+parseInt(index + 1)+') .iC.xt_v8').attr("href")))

                        let priceVal = parseFloat($('#PL li:nth-child('+parseInt(index + 1)+') .pb_v8 .pt_v8').text().replace(',','.'))
                        let shipmentPriceVal = parseFloat($('#PL li:nth-child('+parseInt(index + 1)+') .pb_v8 em').text().replace(',','.')) || 0
                        let shipmentDaysVal = ($('#PL li:nth-child('+parseInt(index + 1)+') .w_v8 .sd_v8').text()) ? (($('#PL li:nth-child('+parseInt(index + 1)+') .w_v8 .sd_v8').text() == "Bugün kargoda") ? 0 : ($('#PL li:nth-child('+parseInt(index + 1)+') .w_v8 .sd_v8').text() == "Yarın kargoda") ? 1 : parseInt($('#PL li:nth-child('+parseInt(index + 1)+') .w_v8 .sd_v8').text())) : 0
                        let sellerVal = $('#PL li:nth-child('+parseInt(index + 1)+') .w_v8 .v_v8').text().split('/')
                        let sellerProductNameVal = $('#PL li:nth-child('+parseInt(index + 1)+') .w_v8 .pn_v8').text()

                        let subSellerTitleVal = {}

                        if(sellerVal.length == 2)
                            subSellerTitleVal = {subSellerTitle : sellerVal[1].trim()}
                          
                        product.sellers.push({    
                            price: priceVal,
                            shipmentPrice: shipmentPriceVal,
                            shipmentDays: shipmentDaysVal,
                            sellerTitle: $('#PL li:nth-child('+parseInt(index + 1)+') .w_v8 .rcm_v8').attr("data-n") || sellerVal[0],
                            ...subSellerTitleVal,
                            sellerProductName: sellerProductNameVal,
                            sellerLink: (uri.get('r').search('http') == -1) ? "https://www.XXX.com" + uri.get('r') : uri.get('r')
                        });
                    })
                }
                else{
                    let uri = new URLSearchParams(decodeURIComponent($('#pd_v8 .iC.xt_v8').attr("href")))
        
                    product.sellers.push({    
                        price: parseFloat($('#pd_v8 .pb_v8 .pt_v8').text().replace(',','.')),
                        shipmentPrice: parseFloat($('#pd_v8 .pb_v8 em').text().replace(',','.')) || 0,
                        shipmentDays: ($('#pd_v8 .w_v8 .sd_v8').text()) ? (($('#pd_v8 .w_v8 .sd_v8').text() == "Bugün kargoda") ? 0 : ($('#pd_v8 .w_v8 .sd_v8').text() == "Yarın kargoda") ? 1 : parseInt($('#pd_v8 .w_v8 .sd_v8').text())) : 0,
                        sellerTitle: $('#pd_v8 .bb_w .v_v8 img').attr("alt"),
                        sellerProductName: $('#pd_v8 h1').text(),
                        sellerLink: uri.get('r')
                    });
                }

                products.data.push(product);
                console.log(product.name + ' products.data içerisine aktarıldı');
            }
            
            // Linkler 
            for(let i=0; i < products.links.length; i++)
                await getProductData(products.links[i])

            await SaveCategoryProducts()
        }
        
        for(let i=0; i < category.links.length; i++){   

            await oneCategory(category.links[i])

            await saveProcessedCategory(category.links[i])
        }        
    }

    await Category()
}

main("https://www.XXX.com/gida.html", "categoryLinks.json")