import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture,
} = tiny;

const {Cube, Axis_Arrows, Textured_Phong} = defs

export class Assignment4 extends Scene {
    /**
     *  **Base_scene** is a Scene that can be added to any display canvas.
     *  Setup the shapes, materials, camera, and lighting here.
     */
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        // TODO:  Create two cubes, including one with the default texture coordinates (from 0 to 1), and one with the modified
        //        texture coordinates as required for cube #2.  You can either do this by modifying the cube code or by modifying
        //        a cube instance's texture_coords after it is already created.
        this.shapes = {
            box_1: new Cube(),
            box_2: new Cube(),
            axis: new Axis_Arrows()
        }
        

        for(let x in this.shapes.box_2.arrays.texture_coord) {
            this.shapes.box_2.arrays.texture_coord[x] = vec(this.shapes.box_2.arrays.texture_coord[x][0]*2, this.shapes.box_2.arrays.texture_coord[x][1]*2);
        }
        console.log(this.shapes.box_2.arrays.texture_coord)


        // TODO:  Create the materials required to texture both cubes with the correct images and settings.
        //        Make each Material from the correct shader.  Phong_Shader will work initially, but when
        //        you get to requirements 6 and 7 you will need different ones.
        this.materials = {
            phong: new Material(new Textured_Phong(), {
                color: hex_color("#ffffff"),
            }),
            texture: new Material(new Texture_Rotate(), {
                color: hex_color("#000000"),
                ambient: 1.0, diffusivity: 0.1, specularity: 0.1,
                texture: new Texture("assets/poptart.png", 'NEAREST')
            }),
            texture_2: new Material(new Texture_Scroll_X(), {
                color: hex_color("#000000"),
                ambient: 1.0, diffusivity: 0.1, specularity: 0.1,
                texture: new Texture("assets/pika.png", 'LINEAR_MIPMAP_LINEAR')
            }),
        }

        this.initial_camera_location = Mat4.look_at(vec3(0, 10, 20), vec3(0, 0, 0), vec3(0, 1, 0));
        this.last_ang = 0;
    }

    make_control_panel() {
        // TODO:  Implement requirement #5 using a key_triggered_button that responds to the 'c' key.
        this.key_triggered_button("Start/Stop Rotation", ["c"], () => {
            this.rotating = !this.rotating;
        });
        this.new_line();
    }

    display(context, program_state) {
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(Mat4.translation(0, 0, -8));
        }

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, 1, 100);

        const light_position = vec4(10, 10, 10, 1);
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 1000)];

        let t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
        let model_transform = Mat4.identity();

        //  Box 1

        //40pi  rad / 60sec
        //60    rad / 60sec
        let rpm = this.last_ang * Math.PI * (1/30);
        let b1mt = model_transform.times(Mat4.translation(-2, 0, 0)).times(Mat4.rotation(20*rpm, 1, 0, 0));
        this.shapes.box_1.draw(context, program_state, b1mt, this.materials.texture);

        //  Box 2
        b1mt = model_transform.times(Mat4.translation(2, 0, 0)).times(Mat4.rotation(30*rpm, 0, 1, 0));
        this.shapes.box_2.draw(context, program_state, b1mt, this.materials.texture_2);

        if(this.rotating) this.last_ang += dt;
        
        console.log(program_state.animation_time / 1000)
    }
}


class Texture_Scroll_X extends Textured_Phong {
    // TODO:  Modify the shader below (right now it's just the same fragment shader as Textured_Phong) for requirement #6.
    fragment_glsl_code() {
        return this.shared_glsl_code() + `
            varying vec2 f_tex_coord;
            uniform sampler2D texture;
            uniform float animation_time;
            float at, ax, last;
            vec2 f_tex_coord_mod;

            float boxed(vec2 f_tex_coord_mod, vec2 v) {
                if(f_tex_coord_mod.x < (0.85 + v.x) && f_tex_coord_mod.y < (0.85 + v.y)) {
                    if(f_tex_coord_mod.x > (0.15 + v.x) && f_tex_coord_mod.y > (0.15 + v.y)) {
                        if(f_tex_coord_mod.x < (0.25 + v.x) || f_tex_coord_mod.x > (0.75 + v.x) 
                        || f_tex_coord_mod.y < (0.25 + v.y) || f_tex_coord_mod.y > (0.75 + v.y)) 
                        {
                            return 0.0;
                        }
                    }
                }
                return 1.0;
            }

            void main(){
                // Sample the texture image in the correct place:
                
                ax = mod(animation_time, 0.5);
                f_tex_coord_mod = f_tex_coord - vec2(ax*2.0, 0);
                vec4 tex_color = texture2D( texture, f_tex_coord_mod);

                tex_color.xyz *= boxed(f_tex_coord_mod, vec2(-1, 0));
                tex_color.xyz *= boxed(f_tex_coord_mod, vec2(-1, 1));
                tex_color.xyz *= boxed(f_tex_coord_mod, vec2(0, 0));
                tex_color.xyz *= boxed(f_tex_coord_mod, vec2(0, 1));
                tex_color.xyz *= boxed(f_tex_coord_mod, vec2(1, 0));
                tex_color.xyz *= boxed(f_tex_coord_mod, vec2(1, 1));

                if( tex_color.w < .01 ) discard;
                                                                         // Compute an initial (ambient) color:
                gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w ); 
                                                                         // Compute the final color with contributions from lights:
                gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
                last = animation_time;
            } 
        `;
    }
}


class Texture_Rotate extends Textured_Phong {
    // TODO:  Modify the shader below (right now it's just the same fragment shader as Textured_Phong) for requirement #7.
    fragment_glsl_code() {
        return this.shared_glsl_code() + `
            varying vec2 f_tex_coord;
            uniform sampler2D texture;
            uniform float animation_time;
            float at, ang;
            vec2 f_tex_coord_mod;

            void main(){
                // Sample the texture image in the correct place:
                at = mod(animation_time, 4.0);

                ang = 15.0 * 2.0 * 3.14159 * (at / 60.0);
                f_tex_coord_mod = (f_tex_coord - vec2(0.5, 0.5)) * mat2(cos(ang), sin(ang), -sin(ang), cos(ang));
                f_tex_coord_mod = f_tex_coord_mod + 0.5;
                

                vec4 tex_color = texture2D( texture, f_tex_coord_mod );
                if(f_tex_coord_mod.x < 0.85 && f_tex_coord_mod.y < 0.85) {
                    if(f_tex_coord_mod.x > 0.15 && f_tex_coord_mod.y > 0.15) {
                        if(f_tex_coord_mod.x < 0.25 || f_tex_coord_mod.x > 0.75
                        || f_tex_coord_mod.y < 0.25 || f_tex_coord_mod.y > 0.75) 
                        {
                            tex_color = vec4(0, 0, 0, 1);
                        }
                    }
                }
                if( tex_color.w < .01 ) discard;
                                                                         // Compute an initial (ambient) color:
                gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w ); 
                                                                         // Compute the final color with contributions from lights:
                gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
        } `;
    }
}

