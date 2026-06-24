let obra;
let imgCirculos;
let mouseClickeado = true;
let estado = "comenzar";
let fuenteTexto;
let fuenteMonitor;


//-------------CONFIGURACION INICIAL-----------------
let AMP_MIN = 0.001;
let AMP_MAX = 0.563;

let NOTA_MIN = 48;
let NOTA_MAX = 76;

let calibrandoAmp = true;
let monitor = false;

let umbralRuido = 0.1;
let umbralDuracionSonido = 1300;

//-------------SONIDO GENERAL-----------------
let mic;
let audioIniciado = false;

//-------------AMPLITUD-----------------
let pisoAmp = Infinity;
let techoAmp = -Infinity;
let amp = 0;
let intensidad = 0;

//----------ANALISIS FRECUENCIA------
let pitch;
const model_url =
  "https://cdn.jsdelivr.net/gh/ml5js/ml5-data-and-models/models/pitch-detection/crepe/";

let frec = 0;
let notaMidi = 0;
let altura = 0;
let difAltura = 0;

//--------GESTORES-------
let gestorAmp;
let gestorFrec;

//-------ESTADOS Y EVENTOS DE SONIDO-----
let haySonido = false;
let antesHabiaSonido = false;
let empezoElSonido = false;
let terminoElSonido = false;

//-------TEMPORIZADORES----

let marcaInicioSonido = 0;
let marcaFinSonido = 0;
let durSonido = 0;
let durSilencio = 0;
let sonidoLargo = false;
let ultimoSonidoLargo = false;

// VARIABLES CLASIFICADOR IA
let classifier;
let label = "";

let modoDifference = false;
let configPanelOpen = false;
const panelX = 40;
const panelY = 40;
const panelW = 420;
const panelH = 300;

function preload(){
  fuenteTexto = loadFont("data/STONIN_.TTF");
  fuenteMonitor = loadFont("data/javatext.ttf");
}

//=================================
//              SETUP
//=================================
function setup() {
  angleMode(RADIANS);
  createCanvas(500, 500);
  mic = new p5.AudioIn();
  gestorAmp = new GestorSenial(AMP_MIN, AMP_MAX);
  gestorFrec = new GestorSenial(NOTA_MIN, NOTA_MAX);

  obra = new Obra();
  obra.iniciar();
}

function gotResult(error, results) {
  if (error) {
    console.error(error);
    return;
  }
  
  let nuevoLabel = results[0].label;

  // Si detecta un aplauso nuevo y en el fotograma anterior NO era aplauso:
  if (nuevoLabel == "Aplauso" && label != "Aplauso") {
    modoDifference = !modoDifference; // Alterna entre true (prendido) y false (apagado)
  }

  // Actualizamos el label para el próximo fotograma
  label = nuevoLabel;
}

//=================================
//              DRAW
//=================================

function draw() {
  background(255);

  //------ACTIVACION DE AUDIO----
  if (!audioIniciado) {
    fill(0);
    textFont(fuenteTexto);
    textAlign(CENTER, CENTER);
    textSize(40);
    text("Hacé click para comenzar", width / 2, height / 2);
    if (configPanelOpen) {
      drawConfigPanel();
    }
    return;
  }

  amp = mic.getLevel();

  if (calibrandoAmp) {
    // Captura extremos de amplitud observados para ajustar el rango del gestor.
    pisoAmp = min(pisoAmp, amp);
    techoAmp = max(techoAmp, amp);
    fill(255, 0, 0);
  } else {
    fill(0);
  }

  gestorAmp.actualizar(amp);

  // Variables derivadas del análisis: intensidad (amplitud) y altura (pitch) suavizadas.
  intensidad = gestorAmp.filtrada;
  altura = gestorFrec.filtrada;
  difAltura = gestorFrec.derivada * 10;

  haySonido = intensidad > umbralRuido;

  // Detectores de flanco para disparar eventos una sola vez en inicio/fin de sonido.
  empezoElSonido = haySonido && !antesHabiaSonido;
  terminoElSonido = !haySonido && antesHabiaSonido;

  if (empezoElSonido) {
    // Reinicia temporización de evento sonoro y cierra el tramo de silencio previo.
    marcaInicioSonido = millis();
    durSilencio = millis() - marcaFinSonido;
    sonidoLargo = false;
  }

  if (haySonido) {
    durSonido = millis() - marcaInicioSonido;
    sonidoLargo = durSonido >= umbralDuracionSonido;
  }

  if (terminoElSonido) {
    // Al finalizar, fija la duración final para clasificar el último evento.
    durSonido = millis() - marcaInicioSonido;
    marcaFinSonido = millis();
    ultimoSonidoLargo = durSonido >= umbralDuracionSonido;
    sonidoLargo = false;
  }

  if (!haySonido) {
    durSilencio = millis() - marcaFinSonido;
  }

  if (estado == "comenzar"){
    if (audioIniciado == true){
      estado = "obra";
    }
  }else if (estado == "obra"){
    obra.dibujar(intensidad, notaMidi, haySonido, durSonido, umbralDuracionSonido);
  }

  if (modoDifference) { 
    fill(255); 
    noStroke(); 
    blendMode(DIFFERENCE); 
    rect(0, 0, width, height); 
    blendMode(BLEND); 
  }
  
  // MONITOR VISUAL (Opcional: te ayuda a saber qué está leyendo la IA en la esquina de la pantalla)
  /*fill(0);
  noStroke();
  textSize(16);
  text("IA detecta: " + label, 20, 30);*/

  //---------MONITOREO------
  if (monitor) {
    monitoreo();
    antesHabiaSonido = haySonido; //guardo el estado anterior
    if (configPanelOpen) {
      drawConfigPanel();
    }
    return;
  }

  if (configPanelOpen) {
    drawConfigPanel();
  }

  antesHabiaSonido = haySonido; //guardo el estado anterior

}

//=================================
//              FUNCIONES
//=================================

//-------MONITOREO------

function drawConfigPanel() {
  push();
  noStroke();
  fill(255, 240);
  rect(panelX, panelY, panelW, panelH, 12);
  stroke(0);
  strokeWeight(1);
  noFill();
  rect(panelX, panelY, panelW, panelH, 12);

  noStroke();
  fill(0);
  textFont(fuenteMonitor);
  textSize(18);
  textAlign(LEFT, TOP);
  text("Panel de configuración de micrófono", panelX + 16, panelY + 14);
  textSize(14);
  text("Presioná 'p' para abrir/cerrar", panelX + 16, panelY + 38);

  const labels = [
    `Umbral de ruido: ${umbralRuido.toFixed(3)}`,
    `Amp mínimo: ${AMP_MIN.toFixed(3)}`,
    `Amp máximo: ${AMP_MAX.toFixed(3)}`,
    `Nota MIDI min: ${NOTA_MIN}`,
    `Nota MIDI max: ${NOTA_MAX}`,
  ];

  const descriptions = [
    "Define el umbral de detección de sonido.",
    "Ajusta el rango mínimo para la amplitud.",
    "Ajusta el rango máximo para la amplitud.",
    "Rango mínimo de frecuencia para nota.",
    "Rango máximo de frecuencia para nota.",
  ];

  const labelX = panelX + 20;
  const buttonX = panelX + 250;
  const buttonW = 28;
  const buttonH = 24;

  for (let i = 0; i < labels.length; i++) {
    const y = panelY + 80 + i * 40;
    fill(0);
    textSize(14);
    text(labels[i], labelX, y);
    textSize(12);
    fill(80);
    text(descriptions[i], labelX, y + 18);

    fill(220);
    stroke(0);
    rect(buttonX, y, buttonW, buttonH, 4);
    rect(buttonX + buttonW + 10, y, buttonW, buttonH, 4);

    noStroke();
    fill(0);
    textAlign(CENTER, CENTER);
    text("-", buttonX + buttonW / 2, y + buttonH / 2 - 1);
    text("+", buttonX + buttonW + 10 + buttonW / 2, y + buttonH / 2 - 1);
    textAlign(LEFT, TOP);
  }

  pop();
}

function monitoreo() {
  background(0);
  textFont(fuenteMonitor);
  textSize(20);
  textAlign(LEFT, BASELINE);
  text(
    "AMP: " +
      amp.toFixed(3) +
      " | pisoAmp: " +
      pisoAmp.toFixed(3) +
      " | techoAmp: " +
      techoAmp.toFixed(3),
    50,
    50,
  );

  text("FREC: " + frec.toFixed(2), 50, 100);
  text("NOTA: " + notaMidi.toFixed(2), 50, 150);
  text("INTENSIDAD: " + intensidad.toFixed(2), 50, 200);
  text("ALTURA: " + altura.toFixed(2), 50, 250);
  text("DIF ALTURA: " + difAltura.toFixed(2), 50, 300);
  text("DUR SONIDO: " + (durSonido / 1000).toFixed(2) + " s", 50, 350);
  text("DUR SILENCIO: " + (durSilencio / 1000).toFixed(2) + " s", 50, 400);
  text(
    "SONIDO LARGO: " + (sonidoLargo ? "SI" : "NO") +
      " | ULTIMO: " + (ultimoSonidoLargo ? "SI" : "NO") +
      " | UM. " + (umbralDuracionSonido / 1000).toFixed(2) + " s",
    50,
    450,
  );

  gestorAmp.dibujar(width - 270, 100);
  gestorFrec.dibujar(width - 270, 200);
}

//-------INICIALIZACION DE AUDIO-----
async function iniciarAudio() {
  if (audioIniciado) {
    return;
  }

  try {
    // Requisito del navegador: activar WebAudio con interacción del usuario.
    await userStartAudio();
    mic.start(
      () => {
        audioIniciado = true;
        marcaInicioSonido = millis();
        marcaFinSonido = millis();
        // Pitch detection se inicializa cuando el stream del micrófono ya existe.
        startPitch();
        

        classifier = ml5.soundClassifier('https://teachablemachine.withgoogle.com/models/ykJlJOKUs/model.json', () => {
          classifier.classify(gotResult);
          });
      },
      (error) => {
        console.error("No se pudo iniciar el microfono", error);
      },
    );
  } catch (error) {
    console.error("No se pudo habilitar el contexto de audio", error);
  }
}

function mousePressed() {
  if (configPanelOpen && mouseX >= panelX && mouseX <= panelX + panelW && mouseY >= panelY && mouseY <= panelY + panelH) {
    handleConfigPanelClick();
    return false;
  }
  iniciarAudio();
}

function touchStarted() {
  if (configPanelOpen && mouseX >= panelX && mouseX <= panelX + panelW && mouseY >= panelY && mouseY <= panelY + panelH) {
    handleConfigPanelClick();
    return false;
  }
  iniciarAudio();
  return false;
}

//----------------DETECCION DE FRECUENCIA------------
// inicia el modelo de Machine Learning para deteccion de pitch
function startPitch() {
  // Conecta el modelo CREPE al stream de entrada actual.
  pitch = ml5.pitchDetection(
    model_url,
    getAudioContext(),
    mic.stream,
    modelLoaded,
  );
}

function modelLoaded() {
  getPitch();
}

function handleConfigPanelClick() {
  const buttonW = 28;
  const buttonH = 24;
  const left = panelX + 250;
  const right = left + buttonW + 10;

  const rows = [
    panelY + 80,
    panelY + 120,
    panelY + 160,
    panelY + 200,
    panelY + 240,
  ];

  for (let i = 0; i < rows.length; i++) {
    const y = rows[i];
    if (mouseY >= y && mouseY <= y + buttonH) {
      if (mouseX >= left && mouseX <= left + buttonW) {
        adjustConfigValue(i, -1);
        return;
      }
      if (mouseX >= right && mouseX <= right + buttonW) {
        adjustConfigValue(i, 1);
        return;
      }
    }
  }
}

function adjustConfigValue(row, direction) {
  const step = 1;
  switch (row) {
    case 0:
      umbralRuido = constrain(umbralRuido + direction * 0.01, 0, 0.5);
      break;
    case 1:
      AMP_MIN = constrain(AMP_MIN + direction * 0.01, 0, AMP_MAX - 0.01);
      gestorAmp.minimo = AMP_MIN;
      break;
    case 2:
      AMP_MAX = constrain(AMP_MAX + direction * 0.01, AMP_MIN + 0.01, 2);
      gestorAmp.maximo = AMP_MAX;
      break;
    case 3:
      NOTA_MIN = constrain(NOTA_MIN + direction * step, 20, NOTA_MAX - 1);
      gestorFrec.minimo = NOTA_MIN;
      break;
    case 4:
      NOTA_MAX = constrain(NOTA_MAX + direction * step, NOTA_MIN + 1, 120);
      gestorFrec.maximo = NOTA_MAX;
      break;
  }
}

function getPitch() {
  pitch.getPitch(function (err, frequency) {
    if (err) {
      console.error(err);
      getPitch();
      return;
    }

    if (frequency) {
      frec = frequency;
      // Traduce frecuencia continua a escala MIDI para analizar altura musical.
      notaMidi = freqToMidi(frequency);
    } else {
      frec = 0;
      notaMidi = 0;
    }

    gestorFrec.actualizar(notaMidi);
    // Consulta continua para mantener actualización de altura en tiempo real.
    getPitch();
  });
}

//--------TECLADO------
function keyPressed() {
  if (key === "p" || key === "P") {
    configPanelOpen = !configPanelOpen;
    return false;
  }

  if (key === "c" || key === "C") {
    calibrandoAmp = !calibrandoAmp;
    // Exporta rápidamente los extremos capturados para pegarlos en configuración.
    console.log("AMP_MIN =", pisoAmp);
    console.log("AMP_MAX =", techoAmp);
    console.log(`let AMP_MIN = ${pisoAmp}; let AMP_MAX = ${techoAmp};`);
  }

  if (key === "m" || key === "M") {
    monitor = !monitor;
  }
}
