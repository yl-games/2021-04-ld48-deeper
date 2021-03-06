import 'phaser';
import { setupMinimap } from './minimap';

import { createStrokeText } from "./utils/text";

import { FunnyJellyfish, Jellyfish } from './Jellyfish'
import { IBound } from 'matter';

const pauseKeys = [Phaser.Input.Keyboard.KeyCodes.ESC, Phaser.Input.Keyboard.KeyCodes.P];
const shootKeys = [Phaser.Input.Keyboard.KeyCodes.SPACE, Phaser.Input.Keyboard.KeyCodes.X];

export default class Demo extends Phaser.Scene {
    constructor ()
    {
        super('demo');
    }

    preload ()
    {
        this.load.audio("level1", "assets/audio/shipping-lanes.ogg");
        this.load.audio("damage", "assets/audio/dash1.ogg");
        this.load.image("dude", 'assets/dude.png');
        this.load.atlas('atlas', "assets/ld48-a.png", 'assets/atlas.json');
    }

    player : Phaser.Physics.Matter.Image
    playerData = { hp: 100 }
    cursors: any
    posText : Phaser.GameObjects.Text
    playerDataText : Phaser.GameObjects.Text
    depthText : Phaser.GameObjects.Text
    isPaused = false

    bullets
    dmgSound : Phaser.Sound.BaseSound
    musicLevel1 : Phaser.Sound.BaseSound

    // pauseLayer : Phaser.GameObjects.Layer

    create ()
    {
        const mainCam = this.cameras.main;

        const gameplayLayer = this.add.layer();
        const uiLayer = this.add.layer().setDepth(10);
        const pauseLayer = this.add.layer().setDepth(20);
        this.dmgSound = this.sound.add('damage');
        this.musicLevel1 = this.sound.add('level1');
        this.musicLevel1.play({ volume: 0.3 });

        uiLayer.add(this.add.text(10, 10, 'DEEPER BLUE DEMO v0.1').setScrollFactor(0));
        this.posText = this.add.text(10, 25, `x: ???, y: ???`).setScrollFactor(0);
        this.playerDataText = this.add.text(10, 45, `hp: ???`).setScrollFactor(0);
        this.depthText = this.add.text(mainCam.width / 2 - 20, mainCam.height / 2 - 40, `??? m`).setScrollFactor(0);

        uiLayer.add(this.posText);
        uiLayer.add(this.playerDataText);
        uiLayer.add(this.depthText);

        this.player = this.matter.add.image(0, 0, 'atlas', 'sub').setScale(3);
        this.player.name = "player";

        let jellyGroup = this.add.group();
        // jellyGroup.createMultiple()

        //this.bullets = new Bullets(this);

        // this.player.setCollideWorldBounds(true);

        this.anims.create({ key:'jellyfish', frames: this.anims.generateFrameNames('atlas', { prefix: 'jellyfish', end: 2 }), repeat: -1, frameRate: 2});

        let bounds = {min: {x: -0, y: -1000}, max: {x: 2000, y: 1000}}
        this.createMany(32, bounds, 
            (scene, x, y) => new FunnyJellyfish(scene, x, y), gameplayLayer);

        this.setupWasdCursors();


        let pauseTitle = createStrokeText({thiz: this, x: mainCam.width / 2 - 30, y: 20, text: "PAUSE", style: {
            fontFamily: "Arial Black",
            fontSize: 74,
            color: "white"
        }, stroke: {color: "blue", size: 6}}).setScrollFactor(0);
        pauseLayer.add(pauseTitle);
        pauseLayer.setVisible(false);

        setupMinimap(0.15, this, this.player, mainCam, uiLayer, pauseLayer);

        // this.physics.add.overlap(bullets, enemies, this.hitEnemy, this.checkBulletVsEnemy, this);

        this.setupInputEvents(this, pauseLayer);

        this.player.setFixedRotation();
        this.player.setFrictionAir(0.05);
        this.player.setMass(400);

        //     Phaser.Actions.PlaceOnCircle(balls.getChildren(), { x: 0, y: 0, radius: 300 });
    }

    playerSpeed = 0.2;

    private createMany(n: number, bounds: IBound, addCallback: Function, gameplayLayer: Phaser.GameObjects.Layer) {
        for (let i = 0; i < n; i++) {
            let x = Phaser.Math.Between(bounds.min.x, bounds.max.x);
            let y = Phaser.Math.Between(bounds.min.y, bounds.max.y);

            gameplayLayer.add(this.add.existing(addCallback(this, x, y)));
        }
    }

    private setupInputEvents(scene: Phaser.Scene, pauseLayer: Phaser.GameObjects.Layer) {
        this.input.keyboard.on('keydown', function (event) {
            if (pauseKeys.includes(event.keyCode)) {
                // pauseLayer.setVisible(!pauseLayer.visible);
                // scene.scene.pause();
                // scene.scene.launch('pause');
            }
            if (shootKeys.includes(event.keyCode)) {
                // this.dmgSound.play({volume: 0.1});
                //this.bullets.fireBullet(this.ship.x, this.ship.y);
            }
        });

        
        const damagePlayer = () => {
            this.cameras.main.shake(300, 0.01);
            this.playerData = { hp: this.playerData.hp - 10 };
            this.dmgSound.play({ volume: 0.25 });
        }

        // this.input.on('pointerdown', () => damagePlayer(), this);
        
        this.cameras.main.on('camerashakestart', function () {
            this.cameras.main.setBackgroundColor('rgba(255, 0, 0, 0.5)');
        }, this);

        this.cameras.main.on('camerashakecomplete', function () {
            this.cameras.main.setBackgroundColor('rgb(18,84,84)');
        }, this);

        let onCollision = (event, bodyA, bodyB) => {
            let player = [bodyA, bodyB].find(b => b.gameObject.name === "player")
            if(player) {
                damagePlayer();
            }
            // bodyA.gameObject.setTint(0xff0000);
            // bodyB.gameObject.setTint(0x00ff00);
        }

        this.matter.world.on('collisionstart', onCollision);
    }


    private setupWasdCursors() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.cursors = this.input.keyboard.addKeys(
            {
                up: Phaser.Input.Keyboard.KeyCodes.W,
                down: Phaser.Input.Keyboard.KeyCodes.S,
                left: Phaser.Input.Keyboard.KeyCodes.A,
                right: Phaser.Input.Keyboard.KeyCodes.D
            });
    }

    update(time) {
        this.updatePlayerVelocity({player: this.player, cursors: this.cursors, speed: this.playerSpeed});
        this.posText.setText(`x: ${Math.round(this.player.x)}, y: ${Math.round(this.player.y)}`);
        this.playerDataText.setText(`hp: ${this.playerData.hp}`);
        let meters = Math.round(this.player.x / 20)
        this.depthText.setText(`${meters} m`);
        // let dp = 1 - meters / 200;
        // this.cameras.main.setBackgroundColor(`rgb(${Math.round(18 * dp)}, ${Math.round(84 * dp)}, ${Math.round(84 * dp)})`);
        // this.physics.world.wrap(this.player, 800);
    }

    private updatePlayerVelocity({player, cursors, speed}) {
        if (cursors.left.isDown) {
            player.thrustBack(speed);
        } else if (this.cursors.right.isDown) {
            player.thrust(speed);
        }

        if (cursors.up.isDown) {
            player.thrustLeft(speed);
        } else if (cursors.down.isDown) {
            player.thrustRight(speed);
        }
    }
}

export class Pause extends Phaser.Scene {
    constructor ()
    {
        super('pause');
    }

    Pause = () => {
        Phaser.Scene.call(this, { key: 'sceneB' });
    }

    preload () {
        this.load.image('face', 'assets/dude.png');
    }

    create () {
        const pauseLayer = this.add.layer().setDepth(20);
        this.add.image(400, 300, 'face').setAlpha(0.1);
        
        this.setupInputEvents(this, pauseLayer);
    }

    private setupInputEvents(scene: Phaser.Scene, pauseLayer: Phaser.GameObjects.Layer) {
        this.input.keyboard.on('keydown', function (event) {
            if (pauseKeys.includes(event.keyCode)) {
                pauseLayer.setVisible(!pauseLayer.visible);
                scene.scene.resume('game');
                scene.scene.remove('pause');
            }
        });
    }
}

const config = {
    antialias: false,
    type: Phaser.AUTO,
    backgroundColor: 'rgb(18,84,84)',
    width: 900,
    height: 800,
    scene: [ Demo, Pause ],
    physics: {
        default: 'matter',
        matter: {
            gravity: {
                x: 0,
                y: 0
            },
            debug: true
        }
    },
    audio: {
        disableWebAudio: true
    }
};

const game = new Phaser.Game(config);
