// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.10 <0.9.0;

import {ERC721A, IERC721A} from "erc721a/contracts/ERC721A.sol";
import {ERC721AQueryable} from "erc721a/contracts/extensions/ERC721AQueryable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {ITablelandTables} from "@tableland/evm/contracts/interfaces/ITablelandTables.sol";
import {TablelandDeployments} from "@tableland/evm/contracts/utils/TablelandDeployments.sol";
import {TablelandController, TablelandPolicy} from "@tableland/evm/contracts/TablelandController.sol";
import {URITemplate} from "@tableland/evm/contracts/utils/URITemplate.sol";
import {SQLHelpers} from "@tableland/evm/contracts/utils/SQLHelpers.sol";

/// @title A demo implementation of DIMO VehicleId that stores vehicle defs in a Tableland table.
/// This version tracks a counter representing the total number of rows in the Tableland vehicle defs table,
/// which is used to verify that a vehicle def exists when associating it with a new vehicle id.
contract VehicleId is ERC721A, ERC721AQueryable, AccessControl, URITemplate {
    /// @dev Role that can add new vehicle defs.
    bytes32 public constant VEHICLE_ADMIN_ROLE =
        keccak256("VEHICLE_ADMIN_ROLE");
    /// @dev Row count of vehicle defs.
    uint256 public numDefs;

    /// @dev Tableland table id.
    uint256 private _defsTableId;
    /// @dev Tableland table prefix.
    string private constant DEFS_PREFIX = "dimo_vehicle_defs";
    /// @dev Tableland table schema.
    string private constant DEFS_SCHEMA =
        "id integer primary key, device_type_id text, make text, make_token_id integer, oem_platform_name text, model text, year integer, metadata text, model_style text, model_sub_style text";
    /// @dev A mapping of vehicle ids to vehicle defs (Tableland table row ids)
    mapping(uint256 => uint256) private _idDefs;

    /// @dev Event emitted when a new vehicle def is created.
    /// `id` is the Tableland table row id of the vehicle def
    event VehicleDefCreated(uint256 id);

    /// @dev Event emitted when a new vehicle id is created.
    /// `id` is the vehicle id (token id)
    /// `defId` is the vehicle def id (Tableland table row id)
    event VehicleIdCreated(uint256 id, uint256 defId);

    /// @dev Struct representing a vehicle def.
    struct VehicleDef {
        string deviceTypeId;
        string make;
        uint256 makeTokenId;
        string oemPlatformName;
        string model;
        uint256 year;
        string metadata;
        string modelStyle;
        string modelSubStyle;
    }

    constructor() ERC721A("VehicleId", "VID") {
        // Create a Tableland table owned by this contract to hold vehicle defs
        _defsTableId = TablelandDeployments.get().create(
            address(this),
            SQLHelpers.toCreateFromSchema(DEFS_SCHEMA, DEFS_PREFIX)
        );

        _grantRole(DEFAULT_ADMIN_ROLE, _msgSenderERC721A());
        _grantRole(VEHICLE_ADMIN_ROLE, _msgSenderERC721A());
    }

    /// @dev Returns the Tableland table where vehicle defs are written.
    function getVehicleDefsTable() external view returns (string memory) {
        return SQLHelpers.toNameFromId(DEFS_PREFIX, _defsTableId);
    }

    /// @dev Creates new vehicle defs.
    /// `defs` is an array of `VehicleDef`s
    function createVehicleDefs(VehicleDef[] calldata defs) external {
        require(
            hasRole(VEHICLE_ADMIN_ROLE, _msgSenderERC721A()),
            "unauthorized"
        );

        // Insert the new vehicle defs into the Tableland table
        uint256 len = defs.length;
        ITablelandTables.Statement[]
            memory stmts = new ITablelandTables.Statement[](len);
        for (uint256 i; i < len; ) {
            string memory vals = string.concat(
                SQLHelpers.quote(defs[i].deviceTypeId),
                ",",
                SQLHelpers.quote(defs[i].make),
                ",",
                Strings.toString(defs[i].makeTokenId),
                ",",
                SQLHelpers.quote(defs[i].oemPlatformName),
                ",",
                SQLHelpers.quote(defs[i].model),
                ",",
                Strings.toString(defs[i].year),
                ",",
                SQLHelpers.quote(defs[i].metadata),
                ",",
                SQLHelpers.quote(defs[i].modelStyle),
                ",",
                SQLHelpers.quote(defs[i].modelSubStyle)
            );
            stmts[i] = ITablelandTables.Statement({
                tableId: _defsTableId,
                statement: SQLHelpers.toInsert(
                    DEFS_PREFIX,
                    _defsTableId,
                    "device_type_id,make,make_token_id,oem_platform_name,model,year,metadata,model_style,model_sub_style",
                    vals
                )
            });

            emit VehicleDefCreated(numDefs + i + 1);

            unchecked {
                ++i;
            }
        }
        TablelandDeployments.get().mutate(address(this), stmts);

        numDefs += len;
    }

    /// @dev Mints a new vehicle id.
    /// `defId` is the vehicle def id (Tableland table row id) to be associated with the new vehicle id
    function createVehicleId(uint256 defId) external payable {
        // Check for vehicle def existence
        require(numDefs > 0 && defId <= numDefs, "defId does not exist");

        // Mint new vehicle id
        uint256 vehicleId = _nextTokenId();
        _safeMint(_msgSenderERC721A(), 1);

        // Associate vehicle id with its vehicle def
        _idDefs[vehicleId] = defId;

        emit VehicleIdCreated(vehicleId, defId);
    }

    /// @dev Returns the vehicle def id for the given vehicle id.
    function getVehicleDefId(
        uint256 vehicleId
    ) external view returns (uint256) {
        require(_exists(vehicleId), "vehicleId does not exist");

        return _idDefs[vehicleId];
    }

    /// @dev Updates URI Template used for vehicle token ids.
    function setURITemplate(string[] memory uriTemplate) external {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSenderERC721A()),
            "unauthorized"
        );
        _setURITemplate(uriTemplate);
    }

    /// @inheritdoc ERC721A
    function _startTokenId() internal pure override returns (uint256) {
        return 1;
    }

    /// @inheritdoc ERC721A
    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721A, IERC721A) returns (string memory) {
        if (!_exists(tokenId)) revert URIQueryForNonexistentToken();

        return
            string.concat(
                _getTokenURI(Strings.toString(tokenId)),
                "%20where%20id%3D",
                Strings.toString(_idDefs[tokenId])
            );
    }

    /// @inheritdoc IERC721A
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721A, IERC721A, AccessControl) returns (bool) {
        return
            ERC721A.supportsInterface(interfaceId) ||
            AccessControl.supportsInterface(interfaceId);
    }
}
