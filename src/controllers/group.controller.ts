// src/controllers/group.controller.ts
import { Request, Response } from "express";
import {
  CreateGroupDTO,
  UpdateGroupDTO,
  ListGroupsQueryDTO,
  GroupRecipeParamsDTO,
  ListRecipesInGroupQueryDTO,
} from "../dto/group.dto";
import {
  createGroup,
  getGroup,
  updateGroup,
  deleteGroup,
  listGroups,
  addRecipeToGroup,
  removeRecipeFromGroup,
  listRecipesInGroup,
} from "../service/group.service";

// Helpers
const ownerIdFromReq = (req: Request) => (req as any).user?.id as string;

/** POST /groups */
export async function createGroupCtrl(req: Request, res: Response) {
  const ownerId = ownerIdFromReq(req);
  const body = CreateGroupDTO.parse(req.body);
  const group = await createGroup(ownerId, body);
  return res.status(201).json({ group });
}

/** GET /groups/:id */
export async function getGroupCtrl(req: Request, res: Response) {
  const ownerId = ownerIdFromReq(req);
  const { id } = req.params;
  const group = await getGroup(ownerId, id);
  return res.status(200).json({ group });
}

/** PATCH /groups/:id */
export async function updateGroupCtrl(req: Request, res: Response) {
  const ownerId = ownerIdFromReq(req);
  const { id } = req.params;
  const patch = UpdateGroupDTO.parse(req.body);
  const group = await updateGroup(ownerId, id, patch);
  return res.status(200).json({ group });
}

/** DELETE /groups/:id */
export async function deleteGroupCtrl(req: Request, res: Response) {
  const ownerId = ownerIdFromReq(req);
  const { id } = req.params;
  const r = await deleteGroup(ownerId, id);
  return res.status(200).json(r); // { ok: true }
}

/** GET /groups */
export async function listGroupsCtrl(req: Request, res: Response) {
  const ownerId = ownerIdFromReq(req);
  const query = ListGroupsQueryDTO.parse(req.query);
  const result = await listGroups(ownerId, query);
  return res.status(200).json(result);
}

/** POST /groups/:groupId/recipes/:id */
export async function addRecipeToGroupFromGroupCtrl(req: Request, res: Response) {
  const ownerId = ownerIdFromReq(req);
  const params = GroupRecipeParamsDTO.parse(req.params);
  const { group, wasAdded } = await addRecipeToGroup(ownerId, params.groupId, params.id);
  return res.status(200).json({ group, wasAdded });
}

/** DELETE /groups/:groupId/recipes/:id */
export async function removeRecipeFromGroupFromGroupCtrl(req: Request, res: Response) {
  const ownerId = ownerIdFromReq(req);
  const params = GroupRecipeParamsDTO.parse(req.params);
  const { group, wasRemoved } = await removeRecipeFromGroup(ownerId, params.groupId, params.id);
  return res.status(200).json({ group, wasRemoved });
}

/** GET /groups/:groupId/recipes */
export async function listRecipesInGroupCtrl(req: Request, res: Response) {
  const ownerId = ownerIdFromReq(req);
  const { groupId } = GroupRecipeParamsDTO.pick({ groupId: true }).parse(req.params);
  const query = ListRecipesInGroupQueryDTO.parse(req.query);
  const result = await listRecipesInGroup(ownerId, groupId, query);
  return res.status(200).json(result);
}
