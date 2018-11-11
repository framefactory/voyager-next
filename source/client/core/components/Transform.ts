/**
 * 3D Foundation Project
 * Copyright 2018 Smithsonian Institution
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as THREE from "three";

import { Readonly } from "@ff/core/types";
import math from "@ff/core/math";

import types from "@ff/core/ecs/propertyTypes";
import Hierarchy from "@ff/core/ecs/Hierarchy";

import { INode as ITransformData, TVector3 } from "common/types/presentation";

////////////////////////////////////////////////////////////////////////////////

const _vec3a = new THREE.Vector3();
const _vec3b = new THREE.Vector3();
const _quat = new THREE.Quaternion();

export enum ERotationOrder { XYZ, YZX, ZXY, XZY, YXZ, ZYX }

/**
 * Allows arranging components in a hierarchical structure. Each [[TransformComponent]]
 * contains a transformation which affects its children as well as other components which
 * are part of the same entity.
 */
export default class Transform extends Hierarchy
{
    static readonly type: string = "Transform";

    ins = this.makeProps({
        pos: types.Vector3("Position"),
        rot: types.Vector3("Rotation"),
        ord: types.Enum("Order", ERotationOrder),
        sca: types.Vector3("Scale", [ 1, 1, 1 ]),
        mat: types.Matrix4("Matrix")
    });

    outs = this.makeProps({
        mat: types.Matrix4("Matrix")
    });

    private _object: THREE.Object3D;

    constructor(id?: string)
    {
        super(id);

        this._object = new THREE.Object3D();
        this._object.matrixAutoUpdate = false;
    }

    update()
    {
        const object = this._object;
        const { pos, rot, ord, sca, mat } = this.ins;

        if (mat.changed) {
            object.matrix.fromArray(mat.value);
            object.matrixWorldNeedsUpdate = true;
        }
        else {
            if (pos.changed) {
                object.position.fromArray(pos.value);
            }
            if (rot.changed || ord.changed) {
                _vec3a.fromArray(rot.value).multiplyScalar(math.DEG2RAD);
                const order = types.getEnumName(ERotationOrder, ord.value);
                object.rotation.setFromVector3(_vec3a, order);
            }
            if (sca.changed) {
                object.scale.fromArray(sca.value);
            }

            object.updateMatrix();
        }

        (object.matrix as any).toArray(this.outs.mat.value);
    }

    dispose()
    {
        if (!this._object) {
            return;
        }

        // detach the three.js object from its parent and children
        if (this._object.parent) {
            this._object.parent.remove(this._object);
        }
        this._object.children.slice().forEach(child => this._object.remove(child));

        super.dispose();
    }

    /**
     * Returns the three.js renderable object wrapped in this component.
     * @returns {Object3D}
     */
    get object3D(): THREE.Object3D
    {
        return this._object;
    }

    /**
     * Returns an array of child components of this.
     * @returns {Readonly<Hierarchy[]>}
     */
    get children(): Readonly<Transform[]>
    {
        return this._children as Transform[] || [];
    }

    /**
     * Returns a reference to the local transformation matrix.
     * @returns {TMatrix4}
     */
    get matrix(): Readonly<THREE.Matrix4>
    {
        return this._object.matrix;
    }

    /**
     * Adds a child [[HierarchyComponent]] or [[TransformComponent]] to this.
     * @param {Transform} component
     */
    addChild(component: Transform)
    {
        super.addChild(component);
        this._object.add(component._object);
    }

    /**
     * Removes a child [[HierarchyComponent]] or [[TransformComponent]] from this.
     * @param {Transform} component
     */
    removeChild(component: Transform)
    {
        this._object.remove(component._object);
        super.removeChild(component);
    }

    /**
     * Called by [[Object3DComponent]] to attach its three.js renderable object to the transform component.
     * Do not call this directly.
     * @param {Object3D} object
     */
    addObject3D(object: THREE.Object3D)
    {
        this._object.add(object);
    }

    /**
     * Called by [[Object3DComponent]] to detach its three.js renderable object from the transform component.
     * Do not call this directly.
     * @param {Object3D} object
     */
    removeObject3D(object: THREE.Object3D)
    {
        this._object.remove(object);
    }

    fromData(data: ITransformData)
    {
        const ins = this.ins;

        if (data.matrix) {
            ins.mat.setValue(data.matrix);

            ins.pos.changed = false;
            ins.rot.changed = false;
            ins.ord.changed = false;
            ins.sca.changed = false;
        }
        else {
            if (data.translation) {
                ins.pos.setValue(data.translation);
            }
            if (data.rotation) {
                const q = new THREE.Quaternion().fromArray(data.rotation);
                const e = new THREE.Euler().setFromQuaternion(q, "XYZ");
                ins.rot.setValue(e.toVector3().multiplyScalar(math.RAD2DEG).toArray() as TVector3);
                ins.ord.setValue(ERotationOrder.XYZ);
            }
            if (data.scale) {
                ins.sca.setValue(data.scale);
            }

            ins.mat.changed = false;

            // this updates the matrix from the input properties
            this.update();
        }
    }

    toData(): Partial<ITransformData>
    {
        //const ins = this.ins;
        //const quaternion = this._object.quaternion;

        this._object.matrix.decompose(_vec3a, _quat, _vec3b);

        const data: Partial<ITransformData> = {};

        if (_vec3a.x !== 0 || _vec3a.y !== 0 || _vec3a.z !== 0) {
            data.translation = _vec3a.toArray();
        }
        if (_quat.x !== 0 || _quat.y !== 0 || _quat.z !== 0 || _quat.w !== 1) {
            data.rotation = _quat.toArray();
        }
        if (_vec3b.x !== 1 || _vec3b.y !== 1 || _vec3b.z !== 1) {
            data.scale = _vec3b.toArray();
        }

        return data;
    }
}
