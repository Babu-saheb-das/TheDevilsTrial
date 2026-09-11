function speakDevil(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.pitch = 0.5; // Deep voice pitch
        utterance.rate = 0.9;  // Slow eerie pace
        window.speechSynthesis.speak(utterance);
    }
}
const sfxAttack = new Audio('assets/audio/sword-slash.mp3');
const sfxDamage = new Audio('assets/audio/thunder-hit.mp3');

function playSFX(type) {
    if (type === 'attack') sfxAttack.play();
    if (type === 'damage') sfxDamage.play();
}