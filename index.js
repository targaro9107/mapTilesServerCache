const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 8000;
//const expirationTime = 60 * 60 * 1000; // 1 hora en milisegundos
const expirationTime=false //disable

// Ruta para las imágenes
app.get('/tilecache/:z/:x/:y', async (req, res) => {
    const { z, x, y } = req.params;
    const imagePath = path.join(__dirname, 'cache', z, x, `${y}.png`); // Agregar marca de tiempo

    // Verificar si la imagen ya está en la caché y si no ha expirado
    if (fs.existsSync(imagePath) && !hasExpired(imagePath)) {
        // Si la imagen existe y no ha expirado, enviarla como respuesta
        res.sendFile(imagePath);
    } else {
        // Si la imagen no existe o ha expirado, descargarla de la URL y guardarla en la caché
        const url = `https://c.tile.openstreetmap.org/${z}/${x}/${y}.png`;

        try {
            const response = await axios.get(url, { responseType: 'arraybuffer' });

            // Verificar si la respuesta es un código 200 y si contiene una imagen
            if (response.status === 200 && response.headers['content-type'].startsWith('image') && parseInt(response.data.length) === parseInt(response.headers["content-length"])) {
                // Crear directorios de la ruta si no existen
                fs.mkdirSync(path.dirname(imagePath), { recursive: true });

                // Guardar la imagen en la caché
                fs.writeFileSync(imagePath, response.data);

                // Enviar la imagen como respuesta
                res.sendFile(imagePath);
            } else {
                // Si la respuesta no es un código 200 o no contiene una imagen, enviar una respuesta de error
                res.status(500).send('La URL no devuelve una imagen válida');
            }
        } catch (error) {
            console.log(error)
            // En caso de error, enviar una respuesta de error
            res.status(500).send('Error al descargar la imagen');
        }
    }
});

// Función para verificar si una imagen ha expirado
function hasExpired(imagePath) {

    if(!expirationTime)
        return false
    
    //const expirationTime = 10000; // 1 hora en milisegundos
    const fileStats = fs.statSync(imagePath);
    const fileModifiedTime = new Date(fileStats.mtime).getTime();
    const currentTime = Date.now();

    const hasExpired = (currentTime - fileModifiedTime) > expirationTime;

    if (hasExpired) {
        fs.unlinkSync(imagePath); // Eliminar la imagen si ha expirado
    }

    return hasExpired;
}

app.listen(port, () => {
    console.log(`Servidor de caché de imágenes en ejecución en el puerto ${port}`);
});