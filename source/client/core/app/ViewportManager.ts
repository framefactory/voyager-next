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

import { IManipPointerEvent, IManipTriggerEvent } from "@ff/react/ManipTarget";

import Viewport, {
    EViewportCameraType,
    EViewportCameraView
} from "../app/Viewport";

import Publisher, { IPublisherEvent } from "@ff/core/Publisher";
import { IViewportPointerEvent, IViewportTriggerEvent } from "./Viewport";

////////////////////////////////////////////////////////////////////////////////

const _vec2 = new THREE.Vector2();

export enum EViewportLayout { Single, HorizontalSplit, VerticalSplit, Quad }

export interface IViewportManip
{
    onPointer: (event: IViewportPointerEvent) => boolean;
    onTrigger: (event: IViewportTriggerEvent) => boolean;
}

export interface IViewportLayoutChangeEvent extends IPublisherEvent<ViewportManager>
{
    layout: EViewportLayout;
    viewports: Viewport[];
}

export default class ViewportManager extends Publisher<ViewportManager>
{
    static readonly type: string = "Viewports";

    next: IViewportManip;

    protected _layoutMode: EViewportLayout = -1;
    protected _horizontalSplit: number = 0.5;
    protected _verticalSplit: number = 0.5;

    protected canvasWidth: number = 100;
    protected canvasHeight: number = 100;

    protected viewports: Viewport[] = [];
    protected activeViewport: Viewport = null;

    constructor()
    {
        super();
        this.addEvent("layout");

        this.layout = EViewportLayout.Single;
    }

    forEachViewport(callback: (viewport: Viewport, index: number) => void)
    {
        this.viewports.forEach(callback);
    }

    get layout()
    {
        return this._layoutMode;
    }

    set layout(layout: EViewportLayout)
    {
        if (layout === this._layoutMode) {
            return;
        }

        this._layoutMode = layout;

        const viewports = this.viewports;
        const h = this._horizontalSplit;
        const v = this._verticalSplit;

        switch(layout) {
            case EViewportLayout.Single:
                viewports.length = 1;
                viewports[0] = new Viewport(0, 0, 1, 1);
                break;

            case EViewportLayout.HorizontalSplit:
                viewports.length = 2;
                viewports[0] = new Viewport(0, 0, h, 1);
                viewports[1] = new Viewport(h, 0, 1-h, 1);
                break;

            case EViewportLayout.VerticalSplit:
                viewports.length = 2;
                viewports[0] = new Viewport(0, 0, 1, v);
                viewports[1] = new Viewport(0, v, 1, 1-v);
                break;

            case EViewportLayout.Quad:
                viewports.length = 4;
                viewports[0] = new Viewport(0, 0, h, v);
                viewports[1] = new Viewport(h, 0, 1-h, v).setCamera(EViewportCameraType.Orthographic, EViewportCameraView.Top);
                viewports[2] = new Viewport(0, v, h, 1-v).setCamera(EViewportCameraType.Orthographic, EViewportCameraView.Left);
                viewports[3] = new Viewport(h, v, 1-h, 1-v).setCamera(EViewportCameraType.Orthographic, EViewportCameraView.Front);
                break;
        }

        viewports.forEach((viewport, index) => {
            viewport.index = index;
            viewport.setCanvasSize(this.canvasWidth, this.canvasHeight);
        });

        this.emit<IViewportLayoutChangeEvent>("layout", { viewports, layout: layout });
    }

    get horizontalSplit()
    {
        return this._horizontalSplit;
    }

    get verticalSplit()
    {
        return this._verticalSplit;
    }

    enableHomeGrid(state: boolean)
    {
        this.forEachViewport(viewport => viewport.enableHomeGrid(state));
    }

    setSplit(h: number, v: number)
    {
        const viewports = this.viewports;
        const layoutMode = this._layoutMode;

        this._horizontalSplit = h;
        this._verticalSplit = v;

        switch(layoutMode) {
            case EViewportLayout.HorizontalSplit:
                viewports[0].set(0, 0, h, 1);
                viewports[1].set(h, 0, 1-h, 1);
                break;

            case EViewportLayout.VerticalSplit:
                viewports[0].set(0, 0, 1, v);
                viewports[1].set(0, v, 1, 1-v);
                break;

            case EViewportLayout.Quad:
                viewports[0].set(0, 0, h, v);
                viewports[1].set(h, 0, 1-h, v);
                viewports[2].set(0, v, h, 1-v);
                viewports[3].set(h, v, 1-h, 1-v);
        }
    }

    setCanvasSize(width: number, height: number)
    {
        this.canvasWidth = width;
        this.canvasHeight = height;

        this.viewports.forEach(viewport => viewport.setCanvasSize(width, height));
    }

    onPointer(event: IManipPointerEvent)
    {
        const vpEvent: Partial<IViewportPointerEvent> = event;

        const rect = (vpEvent.originalEvent.currentTarget as HTMLElement).getBoundingClientRect();
        const x = vpEvent.centerX - rect.left;
        const y = vpEvent.centerY - rect.top;

        if ((event.pointerCount === 0 && event.type === "move") || (event.isPrimary && event.type === "down")) {
            this.activeViewport = vpEvent.viewport = this.viewports.find(viewport => viewport.isPointInside(x, y));
        }
        else {
            vpEvent.viewport = this.activeViewport;
        }

        if (vpEvent.viewport) {
            vpEvent.viewport.getDeviceCoords(x, y, _vec2);
            vpEvent.deviceX = _vec2.x;
            vpEvent.deviceY = _vec2.y;
        }
        else {
            vpEvent.deviceX = 0;
            vpEvent.deviceY = 0;
        }

        if (this.next) {
            return this.next.onPointer(vpEvent as IViewportPointerEvent);
        }

        return false;
    }

    onTrigger(event: IManipTriggerEvent)
    {
        const vpEvent: Partial<IViewportTriggerEvent> = event;

        const rect = (vpEvent.originalEvent.currentTarget as HTMLElement).getBoundingClientRect();
        const x = vpEvent.centerX - rect.left;
        const y = vpEvent.centerY - rect.top;

        vpEvent.viewport = this.viewports.find(viewport => viewport.isPointInside(x, y)) || null;

        if (vpEvent.viewport) {
            vpEvent.viewport.getDeviceCoords(x, y, _vec2);
            vpEvent.deviceX = _vec2.x;
            vpEvent.deviceY = _vec2.y;
        }
        else {
            vpEvent.deviceX = 0;
            vpEvent.deviceY = 0;
        }

        if (this.next) {
            return this.next.onTrigger(vpEvent as IViewportTriggerEvent);
        }

        return false;
    }
}