/**
 * 3D Foundation Project
 * Copyright 2019 Smithsonian Institution
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

import Node from "@ff/graph/Node";
import CFloor from "@ff/scene/components/CFloor";

import { IFloor } from "client/schema/setup";

////////////////////////////////////////////////////////////////////////////////

export default class CVFloor extends CFloor
{
    static readonly typeName: string = "CVFloor";

    static readonly text: string = "Floor";
    static readonly icon: string = "";

    get settingProperties() {
        return [
            this.ins.visible,
            this.ins.position,
            this.ins.radius,
            this.ins.color,
            this.ins.opacity,
            this.ins.receiveShadow,
        ];
    }

    get snapshotProperties() {
        return [
            this.ins.opacity,
        ];
    }

    constructor(node: Node, id: string)
    {
        super(node, id);

        this.ins.visible.setValue(false);
        this.ins.receiveShadow.setValue(true);

        // make sure floor is rendered behind other transparent scene objects
        this.floor.renderOrder = -1;
    }

    fromData(data: IFloor)
    {
        data = data || {} as IFloor;

        this.ins.copyValues({
            visible: !!data.visible,
            position: data.position || [ 0, -25, 0 ],
            radius: data.size !== undefined ? data.size : 50,
            color: data.color || [ 0.6, 0.75, 0.8 ],
            opacity: data.opacity !== undefined ? data.opacity : 0.5,
            receiveShadow: !!data.receiveShadow,
        });
    }

    toData(): IFloor
    {
        const ins = this.ins;

        return {
            visible: ins.visible.value,
            position: ins.position.cloneValue(),
            size: ins.radius.value,
            color: ins.color.cloneValue(),
            opacity: ins.opacity.value,
            receiveShadow: ins.receiveShadow.value,
        };
    }
}