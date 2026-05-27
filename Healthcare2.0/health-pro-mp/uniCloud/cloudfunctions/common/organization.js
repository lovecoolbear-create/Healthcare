/**
 * HealthCare Pro - 多组织架构数据模型
 * P2功能：支持企业级多层级组织架构
 * 
 * 组织架构层级：集团 -> 分公司 -> 部门 -> 营养师
 */

const db = uniCloud.database();

class OrganizationService {
  // 创建组织/分公司
  async createOrganization(data) {
    const { name, parent_id, level, admin_id, settings = {} } = data;
    
    const orgCollection = db.collection('he_organizations');
    const result = await orgCollection.add({
      name,
      parent_id: parent_id || null,  // null表示顶级组织
      level: level || 1,             // 1=集团, 2=分公司, 3=部门
      admin_id,                      // 组织管理员
      settings: {
        max_nutritionists: settings.max_nutritionists || 10,
        max_clients: settings.max_clients || 100,
        features: settings.features || ['basic'],
        ...settings
      },
      status: 'active',
      created_at: Date.now(),
      updated_at: Date.now()
    });
    
    return { code: 0, data: { org_id: result.id } };
  }

  // 获取组织架构树
  async getOrganizationTree(orgId) {
    const orgCollection = db.collection('he_organizations');
    
    // 获取当前组织
    const currentOrg = await orgCollection.doc(orgId).get();
    if (currentOrg.data.length === 0) {
      return { code: 404, msg: '组织不存在' };
    }
    
    // 递归获取子组织
    const buildTree = async (parentId) => {
      const children = await orgCollection.where({
        parent_id: parentId,
        status: 'active'
      }).get();
      
      const result = [];
      for (const org of children.data) {
        const childOrgs = await buildTree(org._id);
        result.push({
          ...org,
          children: childOrgs
        });
      }
      return result;
    };
    
    const tree = await buildTree(orgId);
    
    return {
      code: 0,
      data: {
        root: currentOrg.data[0],
        tree
      }
    };
  }

  // 分配营养师到组织
  async assignNutritionist(data) {
    const { user_id, org_id, role = 'nutritionist', supervisor_id } = data;
    
    const memberCollection = db.collection('he_org_members');
    
    // 检查是否已存在
    const existing = await memberCollection.where({
      user_id,
      org_id
    }).get();
    
    if (existing.data.length > 0) {
      return { code: 1, msg: '该用户已是组织成员' };
    }
    
    const result = await memberCollection.add({
      user_id,
      org_id,
      role,          // admin, nutritionist, supervisor, assistant
      supervisor_id,  // 上级主管
      permissions: this.getDefaultPermissions(role),
      joined_at: Date.now(),
      status: 'active'
    });
    
    // 更新用户表的组织信息
    const userCollection = db.collection('he_users');
    await userCollection.doc(user_id).update({
      org_id,
      org_role: role,
      updated_at: Date.now()
    });
    
    return { code: 0, data: { member_id: result.id } };
  }

  // 获取组织成员列表
  async getOrgMembers(orgId, options = {}) {
    const { role, status = 'active', page = 1, limit = 20 } = options;
    
    const memberCollection = db.collection('he_org_members');
    let query = memberCollection.where({
      org_id: orgId,
      status
    });
    
    if (role) {
      query = query.where({ role });
    }
    
    const result = await query
      .skip((page - 1) * limit)
      .limit(limit)
      .get();
    
    // 关联用户详情
    const userCollection = db.collection('he_users');
    const membersWithDetails = await Promise.all(
      result.data.map(async (member) => {
        const userRes = await userCollection.doc(member.user_id).get();
        return {
          ...member,
          user: userRes.data[0] || null
        };
      })
    );
    
    return {
      code: 0,
      data: {
        list: membersWithDetails,
        pagination: {
          page,
          limit,
          total: result.data.length
        }
      }
    };
  }

  // 跨组织客户查询（仅管理员）
  async getCrossOrgClients(adminId, filters = {}) {
    // 验证管理员权限
    const userCollection = db.collection('he_users');
    const adminRes = await userCollection.doc(adminId).get();
    
    if (adminRes.data.length === 0 || adminRes.data[0].role !== 'admin') {
      return { code: 403, msg: '权限不足' };
    }
    
    // 获取管理员所属的所有组织
    const memberCollection = db.collection('he_org_members');
    const orgsRes = await memberCollection.where({
      user_id: adminId,
      role: db.command.in(['admin', 'supervisor']),
      status: 'active'
    }).get();
    
    const orgIds = orgsRes.data.map(m => m.org_id);
    
    // 查询所有组织下的客户
    const clientCollection = db.collection('he_users');
    let query = clientCollection.where({
      role: 'client',
      org_id: db.command.in(orgIds)
    });
    
    if (filters.nutritionist_id) {
      query = query.where({ nutritionist_id: filters.nutritionist_id });
    }
    
    const clients = await query.limit(100).get();
    
    return {
      code: 0,
      data: clients.data,
      meta: {
        org_count: orgIds.length,
        client_count: clients.data.length
      }
    };
  }

  // 获取角色默认权限
  getDefaultPermissions(role) {
    const permissions = {
      admin: ['all'],  // 所有权限
      supervisor: [
        'view_clients',
        'manage_team',
        'view_reports',
        'export_data'
      ],
      nutritionist: [
        'view_own_clients',
        'edit_own_clients',
        'create_plans',
        'view_own_reports'
      ],
      assistant: [
        'view_clients',
        'edit_client_notes',
        'create_follow_ups'
      ]
    };
    return permissions[role] || permissions.nutritionist;
  }

  // 检查权限
  async checkPermission(userId, permission) {
    const memberCollection = db.collection('he_org_members');
    const memberRes = await memberCollection.where({
      user_id: userId,
      status: 'active'
    }).get();
    
    if (memberRes.data.length === 0) {
      return { hasPermission: false, role: null };
    }
    
    const member = memberRes.data[0];
    const permissions = member.permissions || [];
    
    return {
      hasPermission: permissions.includes('all') || permissions.includes(permission),
      role: member.role,
      org_id: member.org_id
    };
  }
}

module.exports = new OrganizationService();
